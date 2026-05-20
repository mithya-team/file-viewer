export type PdfSearchMatch = {
  pageNum: number;
  start: number;
  end: number;
};

export type PdfSearchState = {
  totalMatches: number;
  isSearching: boolean;
};
