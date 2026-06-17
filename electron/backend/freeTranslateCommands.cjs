const { net } = require('electron');
const { toError } = require('./utils.cjs');

function createFreeTranslateCommands() {
  const GOOGLE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t';
  
  let edgeToken = '';
  let edgeTokenExpires = 0;

  // Uses Electron's net.fetch which respects OS proxy settings (unlike Node's global fetch)
  const proxyFetch = (...args) => net.fetch(...args);

  async function translateWithGoogle(text, source, target) {
    const sl = source === 'auto' ? 'auto' : (source === 'Chinese' ? 'zh-CN' : 'en');
    const tl = target === 'Chinese' ? 'zh-CN' : 'en';
    const url = `${GOOGLE_ENDPOINT}&sl=${sl}&tl=${tl}&q=${encodeURIComponent(text)}`;
    
    const response = await proxyFetch(url);
    if (!response.ok) {
      throw new Error(`Google Translate Error (${response.status}): ${await response.text()}`);
    }
    const json = await response.json();
    return json[0].map(item => item[0]).join('');
  }

  async function translateWithEdge(text, source, target) {
    if (Date.now() > edgeTokenExpires || !edgeToken) {
      const tokenRes = await proxyFetch('https://edge.microsoft.com/translate/auth');
      if (!tokenRes.ok) {
        throw new Error(`Failed to get Edge token (${tokenRes.status})`);
      }
      edgeToken = await tokenRes.text();
      // Token usually expires in 10 minutes, refresh after 9 minutes
      edgeTokenExpires = Date.now() + 9 * 60 * 1000;
    }

    const sl = source === 'auto' ? '' : (source === 'Chinese' ? 'zh-Hans' : 'en');
    const tl = target === 'Chinese' ? 'zh-Hans' : 'en';

    const url = `https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0${sl ? `&from=${sl}` : ''}&to=${tl}`;

    const response = await proxyFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${edgeToken}`,
      },
      body: JSON.stringify([{ Text: text }]),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Bing(Edge) Translate Error (${response.status}): ${errText}`);
    }

    const json = await response.json();
    return json[0].translations[0].text;
  }

  async function translateTextFreeInternal(engine, text, sourceLanguage, targetLanguage) {
    switch (engine) {
      case 'google':
        return await translateWithGoogle(text, sourceLanguage, targetLanguage);
      case 'bing':
        return await translateWithEdge(text, sourceLanguage, targetLanguage);
      default:
        return await translateWithEdge(text, sourceLanguage, targetLanguage);
    }
  }

  return {
    async translate_text_free({ engine, text, sourceLanguage, targetLanguage }) {
      try {
        return await translateTextFreeInternal(engine, text, sourceLanguage, targetLanguage);
      } catch (error) {
        throw toError(error);
      }
    },

    async translate_blocks_free({ engine, blocks, sourceLanguage, targetLanguage }) {
      try {
        const results = [];
        // Sequential for simplicity and to avoid rate limiting
        for (const block of blocks) {
          const translatedText = await translateTextFreeInternal(
            engine,
            block.text,
            sourceLanguage,
            targetLanguage
          );
          results.push({ blockId: block.blockId, translatedText });
        }
        return results;
      } catch (error) {
        throw toError(error);
      }
    },
  };
}

module.exports = { createFreeTranslateCommands };
