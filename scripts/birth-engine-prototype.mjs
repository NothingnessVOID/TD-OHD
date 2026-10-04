#!/usr/bin/env node
import { BirthEnginePrototype } from './lib/birth-engine-prototype.mjs';
const args=process.argv.slice(2);
const arg=(name,fallback)=>{const index=args.indexOf(name);return index<0?fallback:args[index+1];};
const engine=arg('--engine','modern');
const input=arg('--input')?JSON.parse(arg('--input')):{utc:arg('--utc')};
if(!input.utc&&!input.date&&!input.birthDate){console.error('Usage: node scripts/birth-engine-prototype.mjs --engine modern|jovian-compatible|both --utc ISO [--runtime PATH] (or --input JSON)');process.exit(2);}
const client=new BirthEnginePrototype({runtime:arg('--runtime')});
try{console.log(JSON.stringify(await client.calculate(input,{engine}),null,2));}finally{await client.close();}
