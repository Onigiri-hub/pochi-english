export function getLecturePages(data) {
  return data.sort(
    (a, b) => Number(a.page_NO) - Number(b.page_NO)
  );
}