# authMe Integration

### Integrate AuthService

1. Add [AuthService](https://mplgaming.atlassian.net/wiki/spaces/CGTD/pages/2316502750/Card+Games+Auth+Flow) proto to protos folder.
2. Load AuthService proto for grpc server startup at app.js ex:-

```ts
import { getConfig } from './connection/zk';
const ZKConfig = getConfig();
const protosToLoad = [
    {
        path: path.join(__dirname, 'protos/CardGamesService.proto'),
        name: ZKConfig.CARD_GAMES_SERVICE_PATH
            ? ZKConfig.CARD_GAMES_SERVICE_PATH
            : 'service-card-games',
    },
    {
        path: path.join(__dirname, 'protos/AuthService.proto'),
        name: ZKConfig.AUTH_SERVICE_PATH
            ? ZKConfig.AUTH_SERVICE_PATH
            : 'service-auth',
    },
];
```

3. Initialise AuthService GRPC client at ./connection/grpc.js ex:-

```ts
if (isZkConfigUse) {
    grpcClientMap.getCardGamesClient = async function getCardGamesClient() {
        return PathFinder.getInstance().getClient({
            serviceName: ZKConfig.CARD_GAMES_SERVICE_PATH
                ? ZKConfig.CARD_GAMES_SERVICE_PATH
                : 'service-card-games',
            serviceNameInProto: 'CardGamesService',
        });
    };

    grpcClientMap.getAuthServiceClient = async function getAuthServiceClient() {
        return PathFinder.getInstance().getClient({
            serviceName: ZKConfig.AUTH_SERVICE_PATH
                ? ZKConfig.AUTH_SERVICE_PATH
                : 'service-auth',
            serviceNameInProto: 'AuthService',
        });
    };
}
```

### Integrate Lib

4. Validate token before socket connection and update server metrics. Add the following code snippet to your socket connection callback function name ex:- connectionCB at /connection/socket.js.

```ts
import { authMe } from 'card-games-lib';

const token = client.handshake.auth.token;
const grpcAuthRes = await authMe.authenticateGameCardServer({
    userAuthToken: token,
});
if (grpcAuthRes && grpcAuthRes.isAuthentic && grpcAuthRes.userId) {
    client.userId = grpcAuthRes.userId;
    Logger.info(`User ${grpcAuthRes.userId} is authenticated ..`);
} else {
    client.disconnect();
}

client.use(authMe.metricsOnMid(client));
```

5. Send Acknowledgement to client. When any EventHandlerFun(ex:- signUpHandler) returns anything then Call authMe.ackMid at /requestHandler/index.js. Ex:-

```ts
import { authMe } from 'card-games-lib';
async function requestHandler(this, [reqEventName, payload, ack], next) {
    const socket = this;

    const parsedPayload = JSON.parse(payload);
    const eventData = parsedPayload.data;
    const metrics = parsedPayload.metrics;

    let response;
    switch (reqEventName) {
        case EVENTS.SIGN_UP_SOCKET_EVENT:
            response = await signUpHandler(eventData, socket);
            authMe.ackMid(
                response,
                metrics,
                socket.userId,
                response && 'tableId' in response ? response.tableId : '', // sometime tableId doesn't exist
                ack
            );
            break;
        default:
            break;
    }

    return false;
}
```

6. Received acknowledgement from client and update metrics. Add metricsEmitMid and clientAck functions to client emitter function ex:- sendEventToClient,sendEventToRoom

```ts
import { authMe } from 'card-games-lib';
// send to client with a socketObject. Function name sendEventToClient
socket.emit(
    eventName,
    authMe.metricsEmitMid(data),
    authMe.clientAck(eventName)
);
```
