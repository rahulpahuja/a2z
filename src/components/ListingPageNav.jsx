import './ListingPageNav.css';

// The way on at the bottom of a product list. While more items on this page are still to load it stays out of
// the way ("Load more" comes first); once the page is complete it offers a large "Go to next page" button, and
// on the last page it says so and offers a way back to the top, so the list never just stops.
export default function ListingPageNav({ currentPage, totalPages, allLoaded, onNext, onTop }) {
  if (totalPages < 2 || !allLoaded) return null;
  if (currentPage < totalPages) {
    return (
      <nav className="listing-next" aria-label="Next page">
        <p className="listing-next__status">Page {currentPage} of {totalPages}</p>
        <button type="button" className="listing-next__button" onClick={() => onNext(currentPage + 1)}>
          Go to next page
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
      </nav>
    );
  }
  return (
    <nav className="listing-next" aria-label="End of list">
      <p className="listing-next__status">You've reached the end · Page {currentPage} of {totalPages}</p>
      <button type="button" className="listing-next__button listing-next__button--quiet" onClick={onTop}>
        <span className="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
        Back to top
      </button>
    </nav>
  );
}
