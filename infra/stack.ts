import * as CDK from 'aws-cdk-lib';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as Connect from 'aws-cdk-lib/aws-connect';
import { IConstruct } from 'constructs';
import {transformAndValidateSync} from "class-transformer-validator";

import {Environment} from "./environment";
import {ConnectLexBot} from './ConnectLexBot';
import {ConnectLambdaFunction} from "./ConnectLambdaFunction";
import {generateMainFlowContent} from "../contact-flow";

const environment: Environment = transformAndValidateSync(Environment, process.env);

const stackNameKebab: string = `hare-krishna-helpline-${environment.ACCOUNT_ID}`;

const app = new CDK.App();
const stack = new CDK.Stack(app, stackNameKebab, {
    env: {
        account: environment.ACCOUNT_ID,
        region: environment.REGION,
    }
});

// Applies to every taggable resource in the stack automatically.
CDK.Tags.of(stack).add('Project', 'HareKrishnaHelpline');
CDK.Tags.of(stack).add('ManagedBy', 'CDK');
CDK.Tags.of(stack).add('Owner', 'PratikTamboli');

// Reusing an existing Connect instance rather than provisioning a new one.
const connectInstanceId = environment.CONNECT_INSTANCE_ID;
const connectInstanceArn = `arn:aws:connect:${environment.REGION}:${environment.ACCOUNT_ID}:instance/${connectInstanceId}`;

const menuBot = new ConnectLexBot(stack, 'menuBot', {
    connectInstanceId,
    name: `${stackNameKebab}-menu`,
    autoBuildBotLocales: true,
    idleSessionTtlInSeconds: 300,
    dataPrivacy: {
        ChildDirected: false
    },
    botLocales: [{
        localeId: 'en_US',
        nluConfidenceThreshold: 0.75,
        intents: [
            {
                name: 'CareerGuidance',
                sampleUtterances: ['career guidance', 'career', 'career help', 'work problem', 'job advice']
                    .map((utterance) => ({utterance})),
            },
            {
                name: 'SpiritualSadhana',
                sampleUtterances: ['spiritual sadhana', 'sadhana', 'spiritual practice', 'chanting help', 'meditation guidance']
                    .map((utterance) => ({utterance})),
            },
            {
                name: 'FamilyGuidance',
                sampleUtterances: ['family and relationships', 'family guidance', 'relationship advice', 'marriage help', 'family problem']
                    .map((utterance) => ({utterance})),
            },
            {
                name: 'FallbackIntent',
                parentIntentSignature: "AMAZON.FallbackIntent",
            }
        ],
    }],
});

const getDailyThoughtLambda = new ConnectLambdaFunction(stack, 'getDailyThoughtLambda', {
    connectInstanceId,
    handler: 'handler',
    entry: './lambda/GetDailyThought.ts',
    functionName: `${stackNameKebab}-daily-thought`,
    runtime: Lambda.Runtime.NODEJS_18_X,
    timeout: CDK.Duration.seconds(8),
});

const hoursOfOperation = new Connect.CfnHoursOfOperation(stack, 'hoursOfOperation', {
    config: [
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
        'SUNDAY',
    ].map((day) => ({
        day,
        startTime: {hours: 9, minutes: 0},
        endTime: {hours: 17, minutes: 0},
    })),
    instanceArn: connectInstanceArn,
    name: "HelplineHoursOfOperation",
    timeZone: "Asia/Kolkata",
});

const careerQueue = new Connect.CfnQueue(stack, 'careerQueue', {
    instanceArn: connectInstanceArn,
    name: "CareerGuidanceQueue",
    hoursOfOperationArn: hoursOfOperation.attrHoursOfOperationArn,
});
careerQueue.applyRemovalPolicy(CDK.RemovalPolicy.RETAIN);

const sadhanaQueue = new Connect.CfnQueue(stack, 'sadhanaQueue', {
    instanceArn: connectInstanceArn,
    name: "SpiritualSadhanaQueue",
    hoursOfOperationArn: hoursOfOperation.attrHoursOfOperationArn,
});
sadhanaQueue.applyRemovalPolicy(CDK.RemovalPolicy.RETAIN);

const familyQueue = new Connect.CfnQueue(stack, 'familyQueue', {
    instanceArn: connectInstanceArn,
    name: "FamilyGuidanceQueue",
    hoursOfOperationArn: hoursOfOperation.attrHoursOfOperationArn,
});
familyQueue.applyRemovalPolicy(CDK.RemovalPolicy.RETAIN);

const mainFlow = new Connect.CfnContactFlow(stack, 'mainFlow', {
    name: 'HelplineMainFlow',
    state: 'ACTIVE',
    type: "CONTACT_FLOW",
    content: generateMainFlowContent(
        menuBot.lexBotAlias.attrArn,
        getDailyThoughtLambda.functionArn,
        careerQueue.attrQueueArn,
        sadhanaQueue.attrQueueArn,
        familyQueue.attrQueueArn,
    ),
    instanceArn: connectInstanceArn,
});

const counselorSecurityProfile = new Connect.CfnSecurityProfile(stack, 'counselorSecurityProfile', {
    instanceArn: connectInstanceArn,
    securityProfileName: "CounselorSecurityProfile",
    permissions: [
        "BasicAgentAccess",
    ],
});

const counselorRoutingProfile = new Connect.CfnRoutingProfile(stack, 'counselorRoutingProfile', {
    instanceArn: connectInstanceArn,
    name: 'CounselorRoutingProfile',
    description: "Routes career, sadhana, and family guidance contacts to counselors.",
    defaultOutboundQueueArn: careerQueue.attrQueueArn,
    mediaConcurrencies: [
        {channel: "VOICE", concurrency: 1},
    ],
    queueConfigs: [
        {delay: 0, priority: 1, queueReference: {channel: "VOICE", queueArn: careerQueue.attrQueueArn}},
        {delay: 0, priority: 1, queueReference: {channel: "VOICE", queueArn: sadhanaQueue.attrQueueArn}},
        {delay: 0, priority: 1, queueReference: {channel: "VOICE", queueArn: familyQueue.attrQueueArn}},
    ],
});
counselorRoutingProfile.applyRemovalPolicy(CDK.RemovalPolicy.RETAIN);

new Connect.CfnUser(stack, 'counselor', {
    instanceArn: connectInstanceArn,
    username: "counselor1",
    password: environment.COUNSELOR_PASSWORD,
    identityInfo: {
        firstName: 'Radha',
        lastName: 'Counselor',
    },
    phoneConfig: {
        phoneType: 'SOFT_PHONE',
    },
    routingProfileArn: counselorRoutingProfile.attrRoutingProfileArn,
    securityProfileArns: [
        counselorSecurityProfile.attrSecurityProfileArn,
    ],
});

// cdk-amazon-connect-resources' shared ConnectCustomResourceLambda (backing
// the Lex bot association and the Lambda function association) has no
// memorySize set and defaults to 128MB, which gets OOM-killed
// ("signal: killed"). Bump it directly since there's no prop on those
// constructs to set it ourselves.
class IncreaseCustomResourceLambdaMemory implements CDK.IAspect {
    visit(node: IConstruct): void {
        if (node instanceof Lambda.CfnFunction && node.node.path.includes('ConnectCustomResourceLambda')) {
            node.addPropertyOverride('MemorySize', 512);
        }
    }
}
CDK.Aspects.of(stack).add(new IncreaseCustomResourceLambdaMemory());

app.synth();
