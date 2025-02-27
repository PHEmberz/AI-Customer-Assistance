const http = require('http');
const {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
} = require('@aws-sdk/client-bedrock-agent-runtime');