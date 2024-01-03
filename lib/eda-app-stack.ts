import * as cdk from 'aws-cdk-lib';
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as events from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { SqsDestination } from "aws-cdk-lib/aws-lambda-destinations";
import * as dynamoDB from "aws-cdk-lib/aws-dynamodb"


export class EDAAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const imagesBucket = new s3.Bucket(this, 'images', {


      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
    });



    // Integration infrastructure   
    const newImageTopic = new sns.Topic(this, 'NewImageTopic', {
      displayName: 'New Image topic',
    });

    const mailerQ = new sqs.Queue(this, 'mailer-queue', {
      receiveMessageWaitTime: cdk.Duration.seconds(10),
    });

    const mailerFn = new lambdanode.NodejsFunction(this, 'mailer-function', {
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(3),
      entry: `${__dirname}/../lambdas/mailer.ts`,
    });

    ////sqs dead letter queue
    const badOrdersQueue = new sqs.Queue(this, "bad-orders-q", {
      retentionPeriod: Duration.minutes(30),
    });

    const ordersQueue = new sqs.Queue(this, "orders-queue", {
      deadLetterQueue: {
        queue: badOrdersQueue,
        // # of rejections by consumer (lambda function)
        maxReceiveCount: 2,
      },
    });

////SQS event source
const rejectionQueue = new sqs.Queue(this, "RejectionEmailDLQ",{ queueName:"RejectionEmailDLQ" });
    const processImageFn = new lambdanode.NodejsFunction(this, 'ProcessImageFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/processImage.ts`,
      timeout: cdk.Duration.seconds(15),
      memorySize: 128,
      deadLetterQueue: rejectionQueue,
    });
    

    //
    const processOrdersFn = new NodejsFunction(this, "ProcessOrdersFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/processOrders.ts`,
      timeout: Duration.seconds(10),
      memorySize: 128,
    });

    /////SNS labs
    const edaTopic = new sns.Topic(this, "EDATopic", {
      displayName: "EDA topic",
    });

    const queue = new sqs.Queue(this, "all-msg-queue", {
      receiveMessageWaitTime: cdk.Duration.seconds(5),
    });

    const failuresQueue = new sqs.Queue(this, "img-failure-queue", {
      receiveMessageWaitTime: cdk.Duration.seconds(5),
    });

    const processSNSMessageFn = new lambdanode.NodejsFunction(
      this,
      "processSNSMsgFn",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        memorySize: 128,
        timeout: cdk.Duration.seconds(3),
        entry: `${__dirname}/../lambdas/processSNSMsg.ts`,
      }
    );

    const processSQSMessageFn = new lambdanode.NodejsFunction(
      this,
      "processSQSMsgFn",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        memorySize: 128,
        timeout: cdk.Duration.seconds(3),
        entry: `${__dirname}/../lambdas/processSQSMsg.ts`,
      }
    );

    const processFailuresFn = new lambdanode.NodejsFunction(
      this,
      "processFailedMsgFn",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        memorySize: 128,
        timeout: cdk.Duration.seconds(3),
        entry: `${__dirname}/../lambdas/processFailures.ts`,
      }
    );

    
    const generateOrdersFn = new NodejsFunction(this, "GenerateOrdersFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/generateOrders.ts`,
      timeout: Duration.seconds(10),
      memorySize: 128,
      environment: {
        QUEUE_URL: ordersQueue.queueUrl,
      },
    });

    const failedOrdersFn = new NodejsFunction(this, "FailedOrdersFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/handleBadOrder.ts`,
      timeout: Duration.seconds(10),
      memorySize: 128,
    });


///////////////////////////////
const imageTable = new dynamoDB.Table(this, "ImagesTable", {
  billingMode: dynamoDB.BillingMode.PAY_PER_REQUEST,
  partitionKey: { name: "ImageName", type: dynamoDB.AttributeType.STRING },
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  tableName: "Images",
});

const eventsTopic = new sns.Topic(this, "eventsTopic", {
  displayName: "Events Topic",
});




const imageProcessQueue = new sqs.Queue(this, "img-created-queue", {
  receiveMessageWaitTime: cdk.Duration.seconds(20),
  deadLetterQueue: {
    queue: rejectionQueue,
    maxReceiveCount: 2
  },
  retentionPeriod: cdk.Duration.seconds(60)
});

///confirmation mailer
const confirmationMailerFn = new lambdanode.NodejsFunction(this, "confirmationMailFn", {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/confirmationMailer.ts`,
        timeout: Duration.seconds(10),
        memorySize: 1024
    });


    ///rejection mailer
    const rejectionMailerFn = new lambdanode.NodejsFunction(this, "rejectionMailFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/rejectionMailer.ts`,
      timeout: Duration.seconds(10),
      memorySize: 1024
  });


    // Event triggers
    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SnsDestination(eventsTopic)
    );

    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_REMOVED,
      new s3n.SnsDestination(eventsTopic)
    );

    const newImageEventSource = new events.SqsEventSource(imageProcessQueue, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(10),
    });


  const newRejectionEventSource = new events.SqsEventSource(rejectionQueue, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(10),
      maxConcurrency: 5
    });

  processImageFn.addEventSource(newImageEventSource);
  rejectionMailerFn.addEventSource(newRejectionEventSource)

  imagesBucket.grantRead(processImageFn);
  imageTable.grantReadWriteData(processImageFn);

  confirmationMailerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: ["*"],
      })
    );

    rejectionMailerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: ["*"],
      })
    );

    processImageFn.addEventSource(newImageEventSource);

    processOrdersFn.addEventSource(
      new SqsEventSource(ordersQueue, {
        maxBatchingWindow: Duration.seconds(5),
        maxConcurrency: 2,
      })
    );

    failedOrdersFn.addEventSource(
      new SqsEventSource(badOrdersQueue, {
        maxBatchingWindow: Duration.seconds(5),
        maxConcurrency: 2,
      })
    );



    // Permissions
    imagesBucket.grantRead(processImageFn);

    // Connect mailerQ as a subscriber to newImageTopic
    newImageTopic.addSubscription(new subs.SqsSubscription(mailerQ));
    newImageTopic.addSubscription(new subs.SqsSubscription(imageProcessQueue));
    new subs.LambdaSubscription(confirmationMailerFn);
    eventsTopic.addSubscription(new subs.SqsSubscription(imageProcessQueue));

    // Create a new event source from the mailerQ
    const newImageMailEventSource = new events.SqsEventSource(mailerQ, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(10),
    }); 

    // Make the mailerFn trigger on messages from mailerQ
    mailerFn.addEventSource(newImageMailEventSource);

    // Give mailerFn permissions to send emails using SES
    new CfnOutput(this, "Generator Lambda name", {
      value: generateOrdersFn.functionName,
    });

    // Output
    new cdk.CfnOutput(this, 'bucketName', {
      value: imagesBucket.bucketName,
    });

    edaTopic.addSubscription(
      new subs.LambdaSubscription(processSNSMessageFn, {
          filterPolicy: {
            user_type: sns.SubscriptionFilter.stringFilter({
                allowlist: ['Student','Lecturer']
            }),
          },
      })
    );

    edaTopic.addSubscription(
      new subs.SqsSubscription(queue, {
        rawMessageDelivery: true,
        filterPolicy: {
          user_type: sns.SubscriptionFilter.stringFilter({
              denylist: ['Lecturer']  
          }),
          source: sns.SubscriptionFilter.stringFilter({
            matchPrefixes: ['Moodle','Slack']  
        }),
        },
      })
    );

    new cdk.CfnOutput(this, "topicARN", {
      value: edaTopic.topicArn,
    });  

  }
}
