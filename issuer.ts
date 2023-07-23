import { Agent, DidsModule, InitConfig, TypedArrayEncoder, KeyType, DidDocumentService, CredentialsModule, V2CredentialProtocol, WsOutboundTransport, CredentialStateChangedEvent, HttpOutboundTransport, CredentialEventTypes, CredentialState } from '@aries-framework/core'
import { agentDependencies } from '@aries-framework/node'
import { AskarModule } from '@aries-framework/askar'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { HttpInboundTransport } from '@aries-framework/node'
import {
  IndyVdrAnonCredsRegistry,
  IndyVdrIndyDidRegistrar,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
} from '@aries-framework/indy-vdr'
import { indyVdr } from '@hyperledger/indy-vdr-nodejs'
import { AnonCredsCredentialFormatService, AnonCredsModule, LegacyIndyCredentialFormatService } from '@aries-framework/anoncreds'
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
  label: 'demo-agent-cheqd',
  walletConfig: {
    id: 'mainCheqd',
    key: 'demoagentcheqd00000000000000000',
  },
}

const agent = new Agent({
  config: config,
  dependencies: agentDependencies,
  modules: {
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
          genesisTransactions: '<genesis transaction>',
          connectOnStartup: true,
        },
      ],
    }),
    anoncreds: new AnonCredsModule({
      registries: [new IndyVdrAnonCredsRegistry()],
    }),
    dids: new DidsModule({
      registrars: [new IndyVdrIndyDidRegistrar()],
      resolvers: [new IndyVdrIndyDidResolver()],
    }),
    credentials: new CredentialsModule({
      credentialProtocols: [
        new V2CredentialProtocol({
          credentialFormats: [new LegacyIndyCredentialFormatService(), new AnonCredsCredentialFormatService()],
        }),
      ],
    }),
  },
})


const seed = TypedArrayEncoder.fromString(`<seed>`) // What you input on bcovrin. Should be kept secure in production!
const unqualifiedIndyDid = `<unqualifiedIndyDid>` // will be returned after registering seed on bcovrin
const indyDid = `did:indy:bcovrin:test:${unqualifiedIndyDid}`

const cheqdDid = await agent.dids.create({
  method: 'cheqd',
  secret: {
    verificationMethod: {
      id: 'key-1',
      type: 'Ed25519VerificationKey2020',
    },
  },
  options: {
    network: 'testnet',
    methodSpecificIdAlgo: 'uuid',
  },
})

await agent.dids.import({
  did: '<did>',
  overwrite: true,
  privateKeys: [
    {
      privateKey: seed,
      keyType: KeyType.Ed25519,
    },
  ],
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

const indyCredentialExchangeRecord = await agent.credentials.offerCredential({
  protocolVersion: 'v2',
  connectionId: '<connection id>',
  credentialFormats: {
    indy: {
      credentialDefinitionId: '<credential definition id>',
      attributes: [
        { name: 'name', value: 'Jane Doe' },
        { name: 'age', value: '23' },
      ],
    },
  },
})

