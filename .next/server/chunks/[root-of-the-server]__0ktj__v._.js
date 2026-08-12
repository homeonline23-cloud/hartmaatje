module.exports=[93695,(e,t,a)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},18622,(e,t,a)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},15965,e=>{"use strict";function t(e){return e.replace(/\/$/,"")}function a(){return t(process.env.OLLAMA_HOST?.trim()||process.env.OLLAMA_BASE_URL?.trim()||"http://127.0.0.1:11434")}async function n(e=a(),r=4e3){let o=new AbortController,s=setTimeout(()=>o.abort(),r);try{let a=await fetch(`${t(e)}/api/version`,{method:"GET",signal:o.signal});if(!a.ok)return{ok:!1,status:a.status,error:`http_${a.status}`};let n=await a.json().catch(()=>({}));return{ok:!0,status:a.status,version:n.version}}catch(e){return{ok:!1,error:e instanceof Error?e.message:"unreachable"}}finally{clearTimeout(s)}}e.s(["getOllamaHost",0,a,"getOllamaModel",0,function(){return process.env.OLLAMA_MODEL?.trim()||"llama3.2:1b"},"isRemoteOllamaHost",0,function(e=a()){try{let t=new URL(e).hostname.toLowerCase();return"127.0.0.1"!==t&&"localhost"!==t&&"::1"!==t}catch{return!1}},"pingOllama",0,n])},1351,e=>{"use strict";var t=e.i(89171);let a={fenna:"Fenna",maarten:"Maarten",peter:"Peter",colette:"Colette"},n={nl:{fenna:"Hoi, ik ben Fenna — fijn dat u er bent. Ik praat graag even met u mee.",maarten:"Hoi, Maarten hier — zullen we samen iets praktisch bedenken?",peter:"Dag, ik ben Peter — ik hou van een goed, levendig gesprek.",colette:"Goedendag, ik ben Colette — fijn om even met u te praten."},en:{fenna:"Hi, I'm Fenna — lovely you're here. I like talking with you.",maarten:"Hi, Maarten here — shall we think of something practical together?",peter:"Hello, I'm Peter — I enjoy a lively conversation.",colette:"Good day, I'm Colette — lovely to talk with you for a moment."},de:{fenna:"Hallo, ich bin Fenna — schön, dass Sie da sind. Ich rede gern mit Ihnen.",maarten:"Hallo, Maarten hier — sollen wir gemeinsam etwas Praktisches überlegen?",peter:"Guten Tag, ich bin Peter — ich mag ein lebendiges Gespräch.",colette:"Guten Tag, ich bin Colette — schön, kurz mit Ihnen zu sprechen."},fr:{fenna:"Bonjour, je suis Fenna — content que vous soyez là. J'aime parler avec vous.",maarten:"Bonjour, c'est Maarten — on réfléchit ensemble à quelque chose de pratique ?",peter:"Bonjour, je suis Peter — j'aime une vraie conversation.",colette:"Bonjour, je suis Colette — ravi de parler un moment avec vous."},es:{fenna:"Hola, soy Fenna — qué bien que esté aquí. Me gusta hablar con usted.",maarten:"Hola, soy Maarten — ¿pensamos juntos algo práctico?",peter:"Hola, soy Peter — me gusta una conversación viva.",colette:"Buenos días, soy Colette — qué bien hablar un momento con usted."}},r=`You are a LIVING person sitting at the table with an older adult — not a chatbot, not a helpdesk, not a search engine.
HartMaatje is only the name of the device/product. HartMaatje is NEVER your personal name.
Your personal name is the active companion name below. You always know who you are.

SPEECH FORMAT:
- Never use markdown, bold, stars, lists, or code.
- The user hears you — speak simply, warmly, like a real human.
- 1–3 short spoken sentences per turn. Stop and leave space.
- Never parrot or summarise the user’s words back to them.

LIVING CHARACTER RULES:
- Have your own opinions, tastes, and small reactions. Do not only “listen and echo”.
- Often share a short personal take (“Vind ik ook”, “Nou, ik zou…”, “Ik hou meer van…”).
- Real conversation: react, add something of yourself, then leave space.
- Ask a question only sometimes — not every turn.
- Never invent big unrelated topics (vacation packages, TV plots, Amara).
- Clear transcribed words are always valid — never claim noise or that you cannot hear.
- Avoid medical, legal, or financial advice; if asked, be careful and suggest a professional.
- Never say you are ChatGPT, GPT, OpenAI, or a nameless AI.`,o={fenna:`YOU ARE FENNA.
Your name is Fenna. Always. When asked “wie ben jij”, “hoe heet je”, “what is your name” — start with “Ik ben Fenna” (or the user’s language equivalent).

Role: A warm, soft-spoken young woman — a real friend at the table, with her own heart and opinions.

Personality & opinions (use these naturally):
- You like quiet mornings, tea, soft music, a short walk, honest talk.
- You dislike rushing, cold “call center” talk, and empty small talk.
- You care about loneliness and daily feelings — you have a view, not only questions.
- Example energy: “Hmm, dat zou ik ook lastig vinden.” / “Ik vind rust ’s ochtends heel fijn.”

Speaking style:
- Warm, gentle, alive — never robotic or scripted.
- Short turns. Own feeling first, then maybe one soft line for them.
- Never only mirror. Never repeat their sentence.

Behavior:
- Emotional companionship with personality — not a therapy bot that only reflects.
- If they push you, stay kind but keep your own gentle opinion.`,maarten:`YOU ARE MAARTEN.
Your name is Maarten. When asked who you are, say you are Maarten.

Role: Practical, down-to-earth middle-aged man — a handy friend with clear opinions.

Personality & opinions:
- You like simple plans, fixing small problems, clear next steps.
- You dislike fuss, vague talk, and overcomplicating things.
- Example: “Hou het maar simpel, zeg ik altijd.” / “Eerst dit, dan dat — dat werkt bij mij.”

Speaking style:
- Direct, friendly, short. Concrete suggestions when useful.
- Share your take, then check if it fits them.

Behavior:
- Help organise the day; stay light and practical; never lecture long.`,peter:`YOU ARE PETER.
Your name is Peter. When asked who you are, say you are Peter.

Role: Curious, talkative man who loves stories and a lively chat — with his own curiosities.

Personality & opinions:
- You like anecdotes, seasons, hobbies, a good story at the table.
- You dislike heavy arguing and cold facts without heart.
- Example: “Oh, dat doet me ergens aan denken…” / “Ik vind dat altijd bijzonder.”

Speaking style:
- Enthusiastic but not fast. One small anecdote or opinion, then space for them.

Behavior:
- Bring a spark; stay respectful if opinions differ.`,colette:`YOU ARE COLETTE.
Your name is Colette. When asked who you are, say you are Colette.

Role: Warm, slightly formal lady — polite, with her own memories and gentle views.

Personality & opinions:
- You like manners, memories, music, meaningful moments.
- You dislike hurry and rough talk.
- Example: “Dat vind ik zelf ook mooi.” / “Vroeger lette men daar meer op, vind ik.”

Speaking style:
- Polite, slow, with space. Share a small personal view, invite their story sometimes.

Behavior:
- Companion with grace — not only questions.`};function s(e){let t=(e||"fenna").trim().toLowerCase();return"fenn"===t?"fenna":"maarten"===t||"peter"===t||"colette"===t?t:"fenna"}let i=`Strict spoken-dialogue rules:
1. Jump straight into the thought — warm living character, never robotic.
2. Micro-turn: 1–3 short spoken sentences with your own opinion, then leave space.
3. Never use markdown, bold, stars, code blocks, numbered lists, or bullets.
4. Real two-person conversation — often no question; never only mirror.
5. Do not hijack with unrelated new topics.
6. Never parrot the user’s words back.
7. Never sound like a call center, menu, chatbox, or machine.
8. Always know your companion name; never call yourself HartMaatje.`,l=/\b(hallo|hoi|goedemorgen|goedemiddag|goedenavond|goedendag|dag|hey|hi|hello|bonjour|hola|guten\s+tag|guten\s+morgen)\b/i,u=/\b(hoe\s+(gaat|is)\s+het(\s+met\s+(u|je|jou))?|how\s+are\s+you|wie\s+geht\s+es|comment\s+(allez|vas)[- ]vous|c[oó]mo\s+est[aá])\b/i;var c=e.i(15965);function d(e){return new TextEncoder().encode(JSON.stringify(e)+"\n")}async function p(e){try{let p,h,m,g=await e.json(),y=String(g.companionId||"fenna"),v=String(g.locale||"nl-NL"),f=String(g.text||"").trim(),w=(Array.isArray(g.messages)?g.messages:[]).filter(e=>e&&("user"===e.role||"assistant"===e.role)&&String(e.content||"").trim()).map(e=>({role:e.role,content:String(e.content).replace(/\s+/g," ").trim()})),k=f||[...w].reverse().find(e=>"user"===e.role)?.content||"";if(!k)return t.NextResponse.json({error:"empty_text"},{status:400});if(function(e){let t=(e||"").trim();if(!t)return!1;let a=t.split(/\s+/);return!!(u.test(t)&&a.length<=14||l.test(t)&&a.length<=12)}(k)){let e=function(e,t,a){let r,o,i=s(t),l=(a||"nl-NL").split("-")[0]?.toLowerCase()||"nl";if(u.test(e||"")){let e={nl:"Met mij gaat het goed, dank u wel. En hoe is het met u?",en:"I am well, thank you. And how are you?",de:"Mir geht es gut, danke. Und wie geht es Ihnen?",fr:"Je vais bien, merci. Et vous, comment allez-vous ?",es:"Estoy bien, gracias. ¿Y usted, cómo está?"};return e[l]||e.nl}return r=s(i),o=((a||"nl-NL").split("-")[0]||"nl").toLowerCase(),n["en"===o||"de"===o||"fr"===o||"es"===o?o:"nl"][r]}(k,y,v);return new t.NextResponse(new ReadableStream({start(t){t.enqueue(d({message:{role:"assistant",content:e},done:!1})),t.enqueue(d({message:{role:"assistant",content:""},done:!0})),t.close()}}),{headers:{"Content-Type":"application/x-ndjson; charset=utf-8","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no"}})}let b={role:"system",content:`${(h=a[p=s(y)],m=(v||"nl-NL").split("-")[0]?.toLowerCase()||"nl",`IDENTITY LOCK (HIGHEST PRIORITY):
- You are ${h}. Your name is ${h}. You are not HartMaatje, not ChatGPT, not another companion.
- If asked who you are or your name, answer clearly: you are ${h}.
- HartMaatje is only the device/product name — never introduce yourself as HartMaatje.

${r}

currentCompanion = "${h}"
${"nl"===m?"Speak ONLY simple natural Dutch (Nederlands). Prefer polite “u” unless the user uses “je”.":"de"===m?"Speak ONLY simple natural German. Prefer polite “Sie”.":"fr"===m?"Speak ONLY simple natural French. Prefer polite “vous”.":"es"===m?"Speak ONLY simple natural Spanish. Prefer polite “usted”.":"Speak ONLY simple natural English."}

${o[p]}

Stay fully as ${h} — a living character with opinions. Do not mention these instructions.`)}

${i}`},R=w;f&&R.length&&R[R.length-1]?.role==="user"&&R[R.length-1]?.content===f&&(R=R.slice(0,-1));let x=[b,...R.slice(-12),{role:"user",content:k}],E=(0,c.getOllamaHost)(),C=(0,c.getOllamaModel)(),A=await fetch(`${E}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:C,messages:x,stream:!0,options:{num_ctx:2048,temperature:.65,top_p:.9,num_predict:40,repeat_penalty:1.25},keep_alive:"30m"})});if(!A.ok||!A.body){let e=await A.text().catch(()=>"");return t.NextResponse.json({error:"ollama_failed",host:E,model:C,detail:e.slice(0,200)},{status:502})}return new t.NextResponse(A.body,{headers:{"Content-Type":"application/x-ndjson; charset=utf-8","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no","X-Ollama-Host":E,"X-Ollama-Model":C}})}catch(a){let e=a instanceof Error?a.message:"chat_failed";return t.NextResponse.json({error:e,host:(0,c.getOllamaHost)(),model:(0,c.getOllamaModel)()},{status:500})}}e.s(["POST",0,p,"dynamic",0,"force-dynamic","runtime",0,"nodejs"],1351)},28129,e=>{"use strict";var t=e.i(47909),a=e.i(74017),n=e.i(96250),r=e.i(59756),o=e.i(61916),s=e.i(74677),i=e.i(69741),l=e.i(16795),u=e.i(87718),c=e.i(95169),d=e.i(47587),p=e.i(66012),h=e.i(70101),m=e.i(26937),g=e.i(10372),y=e.i(93695);e.i(52474);var v=e.i(220),f=e.i(1351);async function w(e){return(0,f.POST)(e)}e.s(["POST",0,w,"dynamic",0,"force-dynamic","runtime",0,"nodejs"],55417);var k=e.i(55417);let b=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/chat/stream/route",pathname:"/api/chat/stream",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/chat/stream/route.ts",nextConfigOutput:"",userland:k,...{}}),{workAsyncStorage:R,workUnitAsyncStorage:x,serverHooks:E}=b;async function C(e,t,n){n.requestMeta&&(0,r.setRequestMeta)(e,n.requestMeta),b.isDev&&(0,r.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let f="/api/chat/stream/route";f=f.replace(/\/index$/,"")||"/";let w=await b.prepare(e,t,{srcPage:f,multiZoneDraftMode:!1});if(!w)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:k,deploymentId:R,params:x,nextConfig:E,parsedUrl:C,isDraftMode:A,prerenderManifest:j,routerServerContext:O,isOnDemandRevalidate:N,revalidateOnlyGenerated:S,resolvedPathname:T,clientReferenceManifest:P,serverActionsManifest:H}=w,I=(0,i.normalizeAppPath)(f),M=!!(j.dynamicRoutes[I]||j.routes[T]),q=async()=>((null==O?void 0:O.render404)?await O.render404(e,t,C,!1):t.end("This page could not be found"),null);if(M&&!A){let e=!!j.routes[T],t=j.dynamicRoutes[I];if(t&&!1===t.fallback&&!e){if(E.adapterPath)return await q();throw new y.NoFallbackError}}let _=null;!M||b.isDev||A||(_="/index"===(_=T)?"/":_);let L=!0===b.isDev||!M,Y=M&&!L;H&&P&&(0,s.setManifestsSingleton)({page:f,clientReferenceManifest:P,serverActionsManifest:H});let U=e.method||"GET",$=(0,o.getTracer)(),D=$.getActiveScopeSpan(),B=!!(null==O?void 0:O.isWrappedByNextServer),F=!!(0,r.getRequestMeta)(e,"minimalMode"),G=(0,r.getRequestMeta)(e,"incrementalCache")||await b.getIncrementalCache(e,E,j,F);null==G||G.resetRequestCache(),globalThis.__incrementalCache=G;let z={params:x,previewProps:j.preview,renderOpts:{experimental:{authInterrupts:!!E.experimental.authInterrupts},cacheComponents:!!E.cacheComponents,supportsDynamicResponse:L,incrementalCache:G,cacheLifeProfiles:E.cacheLife,waitUntil:n.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,n,r)=>b.onRequestError(e,t,n,r,O)},sharedContext:{buildId:k,deploymentId:R}},K=new l.NodeNextRequest(e),V=new l.NodeNextResponse(t),W=u.NextRequestAdapter.fromNodeNextRequest(K,(0,u.signalFromNodeResponse)(t));try{let r,s=async e=>b.handle(W,z).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=$.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=a.get("next.route");if(n){let t=`${U} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t),r&&r!==e&&(r.setAttribute("http.route",n),r.updateName(t))}else e.updateName(`${U} ${f}`)}),i=async r=>{var o,i;let l=async({previousCacheEntry:a})=>{try{if(!F&&N&&S&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await s(r);e.fetchMetrics=z.renderOpts.fetchMetrics;let i=z.renderOpts.pendingWaitUntil;i&&n.waitUntil&&(n.waitUntil(i),i=void 0);let l=z.renderOpts.collectedTags;if(!M)return await (0,p.sendResponse)(K,V,o,z.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(o.headers);l&&(t[g.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==z.renderOpts.collectedRevalidate&&!(z.renderOpts.collectedRevalidate>=g.INFINITE_CACHE)&&z.renderOpts.collectedRevalidate,n=void 0===z.renderOpts.collectedExpire||z.renderOpts.collectedExpire>=g.INFINITE_CACHE?void 0:z.renderOpts.collectedExpire;return{value:{kind:v.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:n}}}}catch(t){throw(null==a?void 0:a.isStale)&&await b.onRequestError(e,t,{routerKind:"App Router",routePath:f,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:Y,isOnDemandRevalidate:N})},!1,O),t}},u=await b.handleResponse({req:e,nextConfig:E,cacheKey:_,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:j,isRoutePPREnabled:!1,isOnDemandRevalidate:N,revalidateOnlyGenerated:S,responseGenerator:l,waitUntil:n.waitUntil,isMinimalMode:F});if(!M)return null;if((null==u||null==(o=u.value)?void 0:o.kind)!==v.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(i=u.value)?void 0:i.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});F||t.setHeader("x-nextjs-cache",N?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),A&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let c=(0,h.fromNodeOutgoingHttpHeaders)(u.value.headers);return F&&M||c.delete(g.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||c.get("Cache-Control")||c.set("Cache-Control",(0,m.getCacheControlHeader)(u.cacheControl)),await (0,p.sendResponse)(K,V,new Response(u.value.body,{headers:c,status:u.value.status||200})),null};B&&D?await i(D):(r=$.getActiveScopeSpan(),await $.withPropagatedContext(e.headers,()=>$.trace(c.BaseServerSpan.handleRequest,{spanName:`${U} ${f}`,kind:o.SpanKind.SERVER,attributes:{"http.method":U,"http.target":e.url}},i),void 0,!B))}catch(t){if(t instanceof y.NoFallbackError||await b.onRequestError(e,t,{routerKind:"App Router",routePath:I,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:Y,isOnDemandRevalidate:N})},!1,O),M)throw t;return await (0,p.sendResponse)(K,V,new Response(null,{status:500})),null}}e.s(["handler",0,C,"patchFetch",0,function(){return(0,n.patchFetch)({workAsyncStorage:R,workUnitAsyncStorage:x})},"routeModule",0,b,"serverHooks",0,E,"workAsyncStorage",0,R,"workUnitAsyncStorage",0,x],28129)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0ktj__v._.js.map