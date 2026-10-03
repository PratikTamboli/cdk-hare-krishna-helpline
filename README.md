# Hare Krishna Helpline

An Amazon Connect spiritual guidance helpline, defined entirely with the AWS CDK.

Callers are greeted, hear a short daily thought (via a Lambda-backed message), then say what kind of guidance they need — career, spiritual sadhana, or family and relationships — and are routed to a counselor queue for that topic. Open all 7 days, 9 AM to 5 PM Eastern.

Mostly native CloudFormation resources (`AWS::Connect::HoursOfOperation`, `Queue`, `RoutingProfile`, `SecurityProfile`, `User`, `ContactFlow`), plus one Lambda-backed custom resource for the Lex bot association, via the [`cdk-amazon-connect-resources`](https://www.npmjs.com/package/cdk-amazon-connect-resources) package.

## Deploying

Requires an existing Amazon Connect instance already provisioned.

```bash
npm install
```

```powershell
$env:ACCOUNT_ID = "<your-account-id>"
$env:REGION = "<your-region>"
$env:CONNECT_INSTANCE_ID = "<your-connect-instance-id>"
$env:COUNSELOR_PASSWORD = "<a password: 8+ chars, upper, lower, digit>"
npm run deploy
```

## Structure

- `infra/stack.ts` — the main stack
- `infra/ConnectLambdaFunction.ts`, `infra/ConnectLexBot.ts` — reusable custom constructs
- `lambda/GetDailyThought.ts` — the daily-thought Lambda
- `contact-flow/MainFlow.ts` — the IVR flow content
