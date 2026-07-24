import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function CartIconButton({ className = '', iconClassName = 'material-symbols-outlined' }) {
  const { itemCount } = useCart();
  return (
    <Link to="/cart" aria-label="Shopping Cart" className={`relative inline-flex items-center justify-center ${className}`}>
      <span className={iconClassName}>shopping_cart</span>
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-primary-container text-on-primary-container text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
