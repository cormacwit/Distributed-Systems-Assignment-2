/* eslint-disable import/extensions, import/no-absolute-path */
import { SQSHandler } from "aws-lambda";


export const handler : SQSHandler = async (event) => {
  console.log("Event ", JSON.stringify(event));
};