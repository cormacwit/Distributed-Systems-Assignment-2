import { SQSHandler } from "aws-lambda";
// import AWS from 'aws-sdk';
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";

if (!SES_EMAIL_TO || !SES_EMAIL_FROM || !SES_REGION) {
  throw new Error(
    "Please add the SES_EMAIL_TO, SES_EMAIL_FROM and SES_REGION environment variables in an env.js file located in the root directory"
  );
}

const client = new SESClient({ region: SES_REGION });

export const handler: SQSHandler = async (event: any) => {
  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body);
    const message = JSON.parse(recordBody.Message);

    if (message.Records) {
      for (const messageRecord of message.Records) {

        const s3e = messageRecord.s3;
        const srcBucket = s3e.bucket.name;
        const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));

        try {
          const message = `Image: ${srcKey} has an invalid type. ${srcKey} was rejected. Its URL is s3://${srcBucket}/${srcKey}`;
          await sendRejectionEmail(message);
        } catch (error: unknown) {
        console.log("Rejection email not sent");
        }
      }
    }
  }
};

async function sendRejectionEmail(message: string) {
  const parameters: SendEmailCommandInput = {
    Destination: {
      ToAddresses: [SES_EMAIL_TO],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: getHtmlContent(message),
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Image Upload Rejected`,
      },
    },
    Source: SES_EMAIL_FROM,
  };
  await client.send(new SendEmailCommand(parameters));
}

function getHtmlContent(message: string) {
  return `
    <html>
      <body>
        <p style="font-size:18px">${message}</p>
      </body>
    </html> 
  `;
}