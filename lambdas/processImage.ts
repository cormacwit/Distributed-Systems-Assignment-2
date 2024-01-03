/* eslint-disable import/extensions, import/no-absolute-path */
import { SQSHandler } from "aws-lambda";
import {
  GetObjectCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const s3 = new S3Client();
const ddbDocClient = createDDbDocClient();

export const handler: SQSHandler = async (event) => {
  console.log("Event ", event);

  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body);  // Parse SQS message
    const message = JSON.parse(recordBody.Message); // Parse SNS message

    if (message.Records) {
      console.log("Record body ", JSON.stringify(message));
      for (const messageRecord of message.Records) {
        const s3e = messageRecord.s3;
        const srcBucket = s3e.bucket.name;
        // Object key may have spaces or unicode non-ASCII characters.
        const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));
        const typeMatch = srcKey.match(/\.([^.]*)$/);
       if (!typeMatch) {
        console.log("Image type could not be detemined.")
        throw new Error("Image type could not be detemined.")
       }
       const imageType = typeMatch[1].toLocaleLowerCase();
       if (imageType != "jpeg" && imageType != "png") {
        console.log(`Image type .${imageType} is not supported.`)
        throw new Error(`Image type .${imageType} is not supported.`)
       }
       const putCommand = new PutCommand({
        TableName: "Images",
        Item: {
          ImageName: srcKey,
        },
      });
      await ddbDocClient.send(putCommand)
        }
      }
    }
  };

  function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION })
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig)
  }