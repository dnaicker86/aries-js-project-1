import { AskarModule } from '@aries-framework/askar'
import {
  Agent,
  InitConfig,
  ConnectionEventTypes,
  ConnectionStateChangedEvent,
  WsOutboundTransport,
  HttpOutboundTransport,
  DidExchangeState,
  OutOfBandRecord,
  ConnectionsModule,
} from '@aries-framework/core'
import { HttpInboundTransport } from '@aries-framework/node'
import { DidsModule, KeyType, DidDocument } from '@aries-framework/core'
import { DidDocumentService } from '@aries-framework/core'
import { agentDependencies } from '@aries-framework/react-native'
import { ariesAskar } from '@hyperledger/aries-askar-react-native'

import {
  CheqdAnonCredsRegistry,
  CheqdDidRegistrar,
  CheqdDidResolver,
  CheqdModule,
  CheqdModuleConfig,
  CheqdDidCreateOptions,
} from '@aries-framework/cheqd'
import { AnonCredsModule } from '@aries-framework/anoncreds'

const initializeCheqdAgent = async () => {


  const config: InitConfig = {
    label: 'demo-agent-cheqd',
    walletConfig: {
      id: 'mainCheqd',
      key: 'demoagentcheqd00000000000000000',
    },
  }

  const agent = new Agent({
    config,
    dependencies: agentDependencies,
    modules: {
      dids: new DidsModule({
        registrars: [new CheqdDidRegistrar()],
        resolvers: [new CheqdDidResolver()],
      }),

      // AnonCreds
      anoncreds: new AnonCredsModule({
        registries: [new CheqdAnonCredsRegistry()],
      }),

      // Add cheqd module
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
      // Indy VDR can optionally be used with Askar as wallet and storage implementation
      askar: new AskarModule({
        ariesAskar,
      }),
    },
  })
    
  // create a key pair
  const key = await agent.wallet.createKey({
    keyType: KeyType.Ed25519,
  })

  // encode public key according to the verification method
  const ed25519PublicKeyBase58 = key.publicKeyBase58

  // Create a DID
  await agent.dids.create<CheqdDidCreateOptions>({
    method: 'cheqd',
    secret: {},
    options: {
      network: 'testnet',
    },
    didDocument: new DidDocument({
      id: 'did:cheqd:testnet:92874297-d824-40ea-8ae5-364a1ec9237d',
      controller: ['did:cheqd:testnet:92874297-d824-40ea-8ae5-364a1ec9237d'],
      verificationMethod: [
        {
          id: 'did:cheqd:testnet:92874297-d824-40ea-8ae5-364a1ec9237d#key-1',
          type: 'Ed25519VerificationKey2018',
          controller: 'did:cheqd:testnet:92874297-d824-40ea-8ae5-364a1ec9237d',
          publicKeyBase58: ed25519PublicKeyBase58,
        },
      ],
      authentication: ['did:cheqd:testnet:92874297-d824-40ea-8ae5-364a1ec9237d#key-1'],
    }),
  })

  await agent.dids.update({
    did: 'did:cheqd:testnet:b84817b8-43ee-4483-98c5-f03760816411',
    // Updates DID Document with an additional verification method if provided
    secret: {
      verificationMethod: {
        id: 'key-2',
        type: 'JsonWebKey2020',
      },
    },
    didDocument: {
      id: 'did:cheqd:testnet:b84817b8-43ee-4483-98c5-f03760816411',
      controller: ['did:cheqd:testnet:b84817b8-43ee-4483-98c5-f03760816411'],
      verificationMethod: [
        {
          id: 'did:cheqd:testnet:b84817b8-43ee-4483-98c5-f03760816411#key-1',
          type: 'Ed25519VerificationKey2020',
          controller: 'did:cheqd:testnet:b84817b8-43ee-4483-98c5-f03760816411',
          publicKeyMultibase: 'z6MknkzLUEP5cxqqsaysNMWoh8NJRb3YsowTCj2D6yhwyEdj',
        },
      ],
      authentication: ['did:cheqd:testnet:b84817b8-43ee-4483-98c5-f03760816411#key-1'],
      // updates did document with a service block
      service: [
        new DidDocumentService({
          id: 'did:cheqd:testnet:b84817b8-43ee-4483-98c5-f03760816411#rand',
          type: 'rand',
          serviceEndpoint: 'https://rand.in',
        }),
      ],
    },
  })

  await agent.dids.deactivate({
    did: 'did:cheqd:testnet:b84817b8-43ee-4483-98c5-f03760816411',
    // an optional versionId parameter
    options: {
      versionId: '3.0',
    },
  })
}

const initializeBobAgent = async () => {
  // Simple agent configuration. This sets some basic fields like the wallet
  // configuration and the label. It also sets the mediator invitation url,
  // because this is most likely required in a mobile environment.
  const config: InitConfig = {
    label: 'demo-agent-bob',
    walletConfig: {
      id: 'mainBob',
      key: 'demoagentbob00000000000000000000',
    },
  }

  // A new instance of an agent is created here
  // Askar can also be replaced by the indy-sdk if required
  const agent = new Agent({
    config,
    modules: {
      askar: new AskarModule({ ariesAskar }),
      connections: new ConnectionsModule({ autoAcceptConnections: true }),
    },
    dependencies: agentDependencies,
  })

  // Register a simple `WebSocket` outbound transport
  agent.registerOutboundTransport(new WsOutboundTransport())

  // Register a simple `Http` outbound transport
  agent.registerOutboundTransport(new HttpOutboundTransport())

  // Initialize the agent
  await agent.initialize()

  return agent
}

const initializeAcmeAgent = async () => {
  // Simple agent configuration. This sets some basic fields like the wallet
  // configuration and the label.
  const config: InitConfig = {
    label: 'demo-agent-acme',
    walletConfig: {
      id: 'mainAcme',
      key: 'demoagentacme0000000000000000000',
    },
    endpoints: ['http://localhost:3001'],
  }

  // A new instance of an agent is created here
  // Askar can also be replaced by the indy-sdk if required
  const agent = new Agent({
    config,
    modules: {
      askar: new AskarModule({ ariesAskar }),
      connections: new ConnectionsModule({ autoAcceptConnections: true }),
    },
    dependencies: agentDependencies,
  })

  // Register a simple `WebSocket` outbound transport
  agent.registerOutboundTransport(new WsOutboundTransport())

  // Register a simple `Http` outbound transport
  agent.registerOutboundTransport(new HttpOutboundTransport())

  // Register a simple `Http` inbound transport
  agent.registerInboundTransport(new HttpInboundTransport({ port: 3001 }))

  // Initialize the agent
  await agent.initialize()

  return agent
}

const createNewInvitation = async (agent: Agent) => {
  const outOfBandRecord = await agent.oob.createInvitation()

  return {
    invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({ domain: 'https://example.org' }),
    outOfBandRecord,
  }
}

const createLegacyInvitation = async (agent: Agent) => {
  const { invitation } = await agent.oob.createLegacyInvitation()

  return invitation.toUrl({ domain: 'https://example.org' })
}

const receiveInvitation = async (agent: Agent, invitationUrl: string) => {
  const { outOfBandRecord } = await agent.oob.receiveInvitationFromUrl(invitationUrl)

  return outOfBandRecord
}

const setupConnectionListener = (agent: Agent, outOfBandRecord: OutOfBandRecord, cb: (...args: any) => void) => {
  agent.events.on<ConnectionStateChangedEvent>(ConnectionEventTypes.ConnectionStateChanged, ({ payload }) => {
    if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id) return
    if (payload.connectionRecord.state === DidExchangeState.Completed) {
      // the connection is now ready for usage in other protocols!
      console.log(`Connection for out-of-band id ${outOfBandRecord.id} completed`)

      // Custom business logic can be included here
      // In this example we can send a basic message to the connection, but
      // anything is possible
      cb()

      // We exit the flow
      process.exit(0)
    }
  })
}


const run = async () => {
  console.log('Initializing Cheqd agent...')
  const cheqdAgent = await initializeCheqdAgent()
  console.log('Initializing Bob agent...')
  const bobAgent = await initializeBobAgent()
  console.log('Initializing Acme agent...')
  const acmeAgent = await initializeAcmeAgent()

  console.log('Creating the invitation as Acme...')
  const { outOfBandRecord, invitationUrl } = await createNewInvitation(acmeAgent)

  console.log('Listening for connection changes...')
  setupConnectionListener(acmeAgent, outOfBandRecord, () =>
    console.log('We now have an active connection to use in the following tutorials')
  )

  console.log('Accepting the invitation as Bob...')
  await receiveInvitation(bobAgent, invitationUrl)
}

export default run

void run()
