import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="py-24 text-center">
      <div className="max-w-md mx-auto px-4">
        <h1 className="font-heading text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-accent text-white font-medium rounded-full hover:bg-blue-600 transition-colors min-h-[48px]"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
