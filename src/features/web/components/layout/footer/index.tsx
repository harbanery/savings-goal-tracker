const Footer = () => {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4">
          <p className="text-sm font-neue-haas text-zinc-600 dark:text-zinc-400 text-center font-light tracking-wider">
            © 2026 Raihan Yusuf — Built with{" "}
            <b className="font-normal text-zinc-900 dark:text-zinc-100">
              Next.js
            </b>{" "}
            &{" "}
            <b className="font-normal text-zinc-900 dark:text-zinc-100">
              Tailwind CSS
            </b>
            , deployed on{" "}
            <b className="font-normal text-zinc-900 dark:text-zinc-100">
              Vercel
            </b>{" "}
            — All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
