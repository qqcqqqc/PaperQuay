import { invoke } from '../platform/electron/core';
import type {
  OpenAICompatibleTranslateOptions,
  OpenAICompatibleTranslateTextOptions,
  TranslationBlockOutput,
  TranslationEngine,
} from '../types/reader';

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallback;
}

export async function translateBlocks(
  engine: TranslationEngine,
  options: OpenAICompatibleTranslateOptions,
): Promise<TranslationBlockOutput[]> {
  try {
    if (engine === 'openai-compatible') {
      return await invoke<TranslationBlockOutput[]>('translate_blocks_openai_compatible', {
        options,
      });
    }

    return await invoke<TranslationBlockOutput[]>('translate_blocks_free', {
      engine,
      blocks: options.blocks,
      sourceLanguage: options.sourceLanguage,
      targetLanguage: options.targetLanguage,
    });
  } catch (error) {
    throw new Error(toErrorMessage(error, '调用翻译接口失败'));
  }
}

export async function translateText(
  engine: TranslationEngine,
  options: OpenAICompatibleTranslateTextOptions,
): Promise<string> {
  try {
    if (engine === 'openai-compatible') {
      return await invoke<string>('translate_text_openai_compatible', {
        options,
      });
    }

    return await invoke<string>('translate_text_free', {
      engine,
      text: options.text,
      sourceLanguage: options.sourceLanguage,
      targetLanguage: options.targetLanguage,
    });
  } catch (error) {
    throw new Error(toErrorMessage(error, '调用翻译接口失败'));
  }
}
