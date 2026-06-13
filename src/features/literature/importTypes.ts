export interface ImportDraftItem {
  path: string;
  title: string;
  authors: string;
  year: string;
  publication: string;
  doi: string;
  url: string;
  abstractText: string;
  journalMetadata?: any | null;
  categoryId: string;
}
