import { SQSHandler } from "aws-lambda";
import {UnProcessedOrder } from './../shared/types'

export const handler: SQSHandler = async (event) => {
  try {
    console.log("Event: ", event);
    for (const record of event.Records) {
      const message = JSON.parse(record.body) as UnProcessedOrder
      console.log(message.customerName);
    }
  } catch (error) {
    console.log(JSON.stringify(error));
  }
};
