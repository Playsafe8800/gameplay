"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.awsHelper = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
class GameHistoryUploader {
    constructor() {
        aws_sdk_1.default.config.update({
            accessKeyId: process.env.AWS_S3_ACCESS_KEY,
            secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
            region: process.env.AWS_S3_REGION,
        });
        this.s3 = new aws_sdk_1.default.S3();
        this.s3Bucket = process.env.AWS_S3_HISTORY_BUCKET_NAME;
    }
    uploadGameHistory(data, roundId) {
        return __awaiter(this, void 0, void 0, function* () {
            const objectName = `${data.rummyType.toLowerCase()}_${data.tbid}_${roundId}.json`;
            if (this.s3Bucket) {
                const params = {
                    Bucket: this.s3Bucket,
                    Key: objectName,
                    Body: JSON.stringify(data),
                    ContentType: 'application/json',
                };
                const result = yield this.s3.putObject(params).promise();
                if (result) {
                    return objectName;
                }
            }
            return '';
        });
    }
    constructS3ObjectURL(objectName) {
        return `https://${this.s3Bucket}.s3.amazonaws.com/${objectName}`;
    }
}
exports.awsHelper = new GameHistoryUploader();
