import { Agent, InitConfig, DidsModule } from '@aries-framework/core'
import { agentDependencies } from '@aries-framework/node'
import { AskarModule } from '@aries-framework/askar'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import {
  IndyVdrAnonCredsRegistry,
  IndyVdrIndyDidRegistrar,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
} from '@aries-framework/indy-vdr'
import { indyVdr } from '@hyperledger/indy-vdr-nodejs'
import { AnonCredsModule } from '@aries-framework/anoncreds'
import { AnonCredsRsModule } from '@aries-framework/anoncreds-rs'
import { anoncreds } from '@hyperledger/anoncreds-nodejs'
import {
  CheqdAnonCredsRegistry,
  CheqdDidRegistrar,
  CheqdDidResolver,
  CheqdModule,
  CheqdModuleConfig,
} from '@aries-framework/cheqd'

const config: InitConfig = {
	label: 'demo-agent-issuer',
	walletConfig: {
	  id: 'mainIssuer',
	  key: 'demoagentcheqd00000000000000000',
	},
  }

const agent = new Agent({
  config,
  dependencies: agentDependencies,
  modules: {
    // Register the Askar module on the agent
    // We do this to have access to a wallet
    askar: new AskarModule({
      ariesAskar,
    }),
    anoncredsRs: new AnonCredsRsModule({
      anoncreds,
    }),
    indyVdr: new IndyVdrModule({
      indyVdr,
      networks: [
        {
          isProduction: false,
          indyNamespace: 'bcovrin:test',
          genesisTransactions: '<genesis transactions>',
          connectOnStartup: true,
        },
      ],
    }),
    cheqd: new CheqdModule(
      new CheqdModuleConfig({
        networks: [
          {
            network: '<mainnet or testnet>',
            cosmosPayerSeed: '<cosmos payer seed or mnemonic>',
          },
        ],
      })
    ),
    anoncreds: new AnonCredsModule({
      registries: [new IndyVdrAnonCredsRegistry(), new CheqdAnonCredsRegistry()],
    }),
    dids: new DidsModule({
      registrars: [new IndyVdrIndyDidRegistrar(), new CheqdDidRegistrar()],
      resolvers: [new IndyVdrIndyDidResolver(), new CheqdDidResolver()],
    }),
  },
})

const schemaResult = await agent.modules.anoncreds.registerSchema({
	schema: {
	  attrNames: ['name'],
	  issuerId: '<did>',
	  name: 'Example Schema to register',
	  version: '1.0.0',
	},
	options: {},
  })
  
  if (schemaResult.schemaState.state === 'failed') {
	throw new Error(`Error creating schema: ${schemaResult.schemaState.reason}`)
  }

  const credentialDefinitionResult = await agent.modules.anoncreds.registerCredentialDefinition({
	credentialDefinition: {
	  tag: 'default',
	  issuerId: '<did>',
	  schemaId: schemaResult.schemaState.schemaId!,
	},
	options: {},
  })
  
  if (credentialDefinitionResult.credentialDefinitionState.state === 'failed') {
	throw new Error(
	  `Error creating credential definition: ${credentialDefinitionResult.credentialDefinitionState.reason}`
	)
  }

  