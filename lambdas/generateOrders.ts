import { Handler } from "aws-lambda";
// const AWS = require("aws-sdk");
import {
  SQSClient,
  SendMessageBatchCommand,
  SendMessageBatchCommandInput,
  SendMessageBatchRequestEntry,
} from "@aws-sdk/client-sqs";
import { v4 } from "uuid";
import { Order } from "../shared/types";

const client = new SQSClient({ region: "eu-west-1" });

type BadOrder = Partial<Order>;
type OrderMix = Order | BadOrder;
const orders: OrderMix[] = [
  {
    customerName: "User1",
    customerAddress: "1 Main Street",
    items: [],
  },
  {
    customerName: "User2",
    customerAddress: "1 Main Street",
    items: [],
  },  {
    customerName: "User3",
    customerAddress: "1 Main Street",
    items: [],
  },
  {
    customerName: "UserX",
    items: [],
  },
  {
    customerName: "User4",
    customerAddress: "2 Main Street",
    items: [],
  },
  {
    customerName: "User5",
    customerAddress: "2 Main Street",
    items: [],
  }, 
  {
    customerName: "User6",
    customerAddress: "2 Main Street",
    items: [],
  },
  {
    customerName: "User7",
    customerAddress: "2 Main Street",
    items: [],
  },  {
    customerName: "User8",
    customerAddress: "2 Main Street",
    items: [],
  },  {
    customerName: "User9",
    customerAddress: "2 Main Street",
    items: [],
  },
];

export const handler: Handler = async (event) => {
  try {
    const entries: SendMessageBatchRequestEntry[] = orders.map((order) => {
      return {
        Id: v4(),
        MessageBody: JSON.stringify(order),
      };
    });
    const batchCommandInput: SendMessageBatchCommandInput = {
      QueueUrl: process.env.QUEUE_URL,
      Entries: entries,
    };

    const batchResult = await client.send(
      new SendMessageBatchCommand(batchCommandInput)
    );

    // const sendCommandInput: SendMessageCommandInput = {
    //   QueueUrl: process.env.QUEUE_URL,
    //   MessageBody: JSON.stringify(badOrder),
    // };

    // const sendResult = await client.send(
    //   new SendMessageCommand(sendCommandInput)
    // );

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: "All orders queued for processing",
    };
  } catch (error) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};
