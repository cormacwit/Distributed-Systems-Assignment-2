import { SQSHandler } from "aws-lambda";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";
import { Order } from './../shared/types'

const ajv = new Ajv();
const isValidOrder = ajv.compile(schema.definitions["Order"] || {});

export const handler: SQSHandler = async (event) => {
  try {
    console.log("Event: ", JSON.stringify(event));
    for (const record of event.Records) {
      const messageBody = JSON.parse(record.body);
      if (!isValidOrder(messageBody)  ) {
        console.log('Bad Order', messageBody?.customerName  )
        throw new Error(" Bad Order");
      }
      console.log('Good Order',messageBody?.customerName)
      // process good order
    }
  } catch (error) {
    throw new Error(JSON.stringify(error));
  }
};