import { formatCommandHints } from './whatsapp.utils';
import { COMMAND_HINTS } from './whatsapp.constants';

export function buildHelpTemplate(userName: string) {
  return {
    templateName: 'command_hints',
    options: {
      languageCode: 'en',
      body: [
        userName,
        formatCommandHints(COMMAND_HINTS),
      ],
    },
  };
}