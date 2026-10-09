import { ANATOMY_TRANSLATIONS } from '../anatomy/translations';
import { CLINICAL_TRANSLATIONS } from './clinicalTranslations';
import { ENGINE_TRANSLATIONS } from './engineTranslations';
import { INLINE_TRANSLATIONS } from './inlineTranslations';
import { SUPPORTING_TRANSLATIONS } from './supportingTranslations';
import { RECANALISATION_TRANSLATIONS } from './recanalisationTranslations';
import type { ContentTranslations } from './content';
import { DIAGRAM_TRANSLATIONS } from './diagramTranslations';
import { COMPOSED_TRANSLATIONS } from './composedTranslations';
import { RECOVERED_STATE_TRANSLATIONS } from './recoveredStateTranslations';

export const CONTENT_TRANSLATIONS: ContentTranslations = {
  ...ANATOMY_TRANSLATIONS,
  ...CLINICAL_TRANSLATIONS,
  ...ENGINE_TRANSLATIONS,
  ...INLINE_TRANSLATIONS,
  ...SUPPORTING_TRANSLATIONS,
  ...RECANALISATION_TRANSLATIONS,
  ...DIAGRAM_TRANSLATIONS,
  ...COMPOSED_TRANSLATIONS,
  ...RECOVERED_STATE_TRANSLATIONS,
};
