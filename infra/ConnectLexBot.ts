import * as crypto from 'crypto';
import * as CDK from 'aws-cdk-lib';
import * as IAM from 'aws-cdk-lib/aws-iam';
import * as Lex from 'aws-cdk-lib/aws-lex';
import { ConnectLexBotAssociation } from "cdk-amazon-connect-resources";
import { Construct } from 'constructs';

/**
 * A Lex V2 bot, published under a "LIVE" alias and associated with a
 * Connect instance so it can be used inside a contact flow.
 */
export class ConnectLexBot extends CDK.Resource {

    private readonly lexRuntimeRole: IAM.Role;

    public readonly lexBot: Lex.CfnBot;
    public readonly lexBotVersion: Lex.CfnBotVersion;
    public readonly lexBotAlias: Lex.CfnBotAlias;
    public readonly lexBotAssociation: ConnectLexBotAssociation;

    constructor(
        scope: Construct,
        id: string,
        props: Omit<Lex.CfnBotProps, 'roleArn'> & {
            connectInstanceId: string,
        },
    ) {
        super(scope, id);

        this.lexRuntimeRole = new IAM.Role(this, "LexRuntimeRole", {
            roleName: `${props.name}-runtime-role`,
            assumedBy: new IAM.ServicePrincipal("lexv2.amazonaws.com"),
        });
        this.lexRuntimeRole.addToPolicy(
            new IAM.PolicyStatement({
                actions: [
                    "polly:SynthesizeSpeech",
                    "comprehend:DetectSentiment",
                    "lambda:invokeFunction",
                ],
                effect: IAM.Effect.ALLOW,
                resources: ["*"],
            })
        );

        this.lexBot = new Lex.CfnBot(this, 'lexBot', {
            roleArn: this.lexRuntimeRole.roleArn,
            ...props,
        });

        // Changing the bot's definition should publish a new version, so the
        // version's own logical id is tagged with a hash of its props.
        const propsToHash: object = {
            ...props,
            connectInstanceId: undefined,
        }
        const propsHash = crypto.createHash('md5').update(JSON.stringify(propsToHash)).digest('hex').slice(0, 6);

        this.lexBotVersion = new Lex.CfnBotVersion(this, `lexBotVersion-${propsHash}`, {
            botId: this.lexBot.attrId,
            botVersionLocaleSpecification: [
                {
                    localeId: 'en_US',
                    botVersionLocaleDetails: {
                        sourceBotVersion: 'DRAFT',
                    },
                }
            ]
        });

        this.lexBotAlias = new Lex.CfnBotAlias(this, "lexBotAlias", {
            botAliasName: "LIVE",
            botId: this.lexBot.attrId,
            botVersion: this.lexBotVersion.attrBotVersion,
            botAliasLocaleSettings: [
                {
                    localeId: 'en_US',
                    botAliasLocaleSetting: {
                        codeHookSpecification: undefined,
                        enabled: true,
                    }
                },
            ],
        });

        this.lexBotAssociation = new ConnectLexBotAssociation(this, 'lexBotAssociation', {
            connectInstanceId: props.connectInstanceId,
            lexBotAliasArn: this.lexBotAlias.attrArn,
        });
    }

}
