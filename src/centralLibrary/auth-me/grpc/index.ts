import { getRandomUUID } from '../helpers';
import { CGsLib } from '../../connections';
import { Logger } from '../../../newLogger';

export async function authenticateGameCardServer(authData: {
  userAuthToken: string;
  appType?: string;
  requestId?: string;
  authToken?: string;
}) {
  try {
    let grpcReqData = {
      requestId: getRandomUUID(),
      authToken: authData.userAuthToken,
    };
    //This condition check is for Component Tests which executes locally
    if (process.env.SERVER_ENV === 'local') {
      grpcReqData = {
        authToken: authData.userAuthToken,
        requestId: authData.requestId as string,
      };
    }

    const GrpcClient =
      await CGsLib.grpcClientMap.getAuthServiceClient(
        authData.appType,
      );
    return await GrpcClient.authenticate().sendMessage(grpcReqData);
  } catch (error) {
    Logger.error(
      'INTERNAL_SERVER_ERROR _CATCH_ERROR_: in authenticateGameCardServer',
      error,
    );
    return null;
  }
}
