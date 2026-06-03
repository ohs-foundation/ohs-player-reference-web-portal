/**
 * Local ESLint plugin: guard against user-visible English embedded as JSX text
 * (library strings belong in the typed message catalog).
 * @type {import('eslint').ESLint.Plugin}
 */
const noBareStringLiterals = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow raw JSX text; use useTranslation().t() with MessageCatalog keys.',
    },
    schema: [],
    messages: {
      bare:
        'Avoid bare JSX text nodes; add a catalog key and use useTranslation().t("key") instead.',
    },
  },
  /** @param {import('eslint').Rule.RuleContext} context */
  create(context) {
    return {
      /** @param {import('estree-jsx').JSXText} node */
      JSXText(node) {
        if (/[^\s\uFEFF\xa0]/.test(node.value)) {
          context.report({ node, messageId: 'bare' });
        }
      },
    };
  },
};

export default {
  meta: { name: 'eslint-plugin-ohs-core', version: '0.0.0' },
  rules: {
    'no-bare-string-literals': noBareStringLiterals,
  },
};
