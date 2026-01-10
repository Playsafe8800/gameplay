import AWS from 'aws-sdk';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

export interface GameHistoryData {
  _id: string;
  cd: string;
  tbid: string;
  rummyType: string;
  lobbyId: number;
  startingUsersCount: number;
  gameDetails: GameDetails[];
}

interface GameDetails {
  roundNo: number;
  winnerId: number;
  createdOn?: string;
  modifiedOn?: string;
  extra_info?: string;
  turnsDetails: TurnsDetails[];
}

interface TurnsDetails {
  turnNo: number;
  userId: number;
  turnStatus: string;
  startState: string;
  cardPicked: string;
  cardPickSource: string;
  cardDiscarded: string;
  endState: string;
  createdOn: string;
  points: number;
}

class GameHistoryUploader {
  private readonly s3: AWS.S3;
  private readonly s3Bucket: string | undefined;

  constructor() {
    AWS.config.update({
      accessKeyId: process.env.AWS_S3_ACCESS_KEY,
      secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
      region: process.env.AWS_S3_REGION,
    });

    this.s3 = new AWS.S3();
    this.s3Bucket = process.env.AWS_S3_HISTORY_BUCKET_NAME;
  }

  async uploadGameHistory(
    data: GameHistoryData,
    roundId: number,
  ): Promise<string> {
    const objectName = `${data.rummyType.toLowerCase()}_${
      data.tbid
    }_${roundId}.json`;

    if (this.s3Bucket) {
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.s3Bucket,
        Key: objectName,
        Body: JSON.stringify(data),
        ContentType: 'application/json',
      };

      const result = await this.s3.putObject(params).promise();
      if (result) {
        return objectName;
      }
    }
    return '';
  }

  private constructS3ObjectURL(objectName: string): string {
    return `https://${this.s3Bucket}.s3.amazonaws.com/${objectName}`;
  }
}

export const awsHelper = new GameHistoryUploader();
