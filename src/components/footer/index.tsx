const Footer = () => {
  return (
    <footer className="bg-black border-t border-gray-900">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4">
          <p className="text-sm font-neue-haas text-gray-300 text-center font-light tracking-wider">
            © 2026 Raihan Yusuf — Built with{" "}
            <b className="font-normal text-white">Next.js</b> &{" "}
            <b className="font-normal text-white">Tailwind CSS</b>, deployed on{" "}
            <b className="font-normal text-white">Vercel</b> — All rights
            reserved
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
