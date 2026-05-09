/**
 * Anki export utility — produces a tab-separated .txt file
 * importable into Anki (Front \t Back \t Tags).
 *
 * Anki's default text importer accepts TSV with optional tags column.
 * We escape tabs/newlines inside fields so the file remains valid.
 */

export interface AnkiCard {
  front: string;
  back: string;
  tags?: string[];
}

const escapeField = (s: string) =>
  (s ?? '')
    .replace(/\t/g, ' ')
    .replace(/\r?\n/g, '<br>')
    .trim();

export const buildAnkiTSV = (cards: AnkiCard[]): string => {
  const header = '#separator:tab\n#html:true\n#tags column:3\n';
  const body = cards
    .map((c) =>
      [
        escapeField(c.front),
        escapeField(c.back),
        (c.tags ?? []).join(' '),
      ].join('\t')
    )
    .join('\n');
  return header + body + '\n';
};

export const downloadAnkiDeck = (cards: AnkiCard[], filename = 'sakura-vocab.txt') => {
  const tsv = buildAnkiTSV(cards);
  const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
