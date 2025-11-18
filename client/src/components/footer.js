function Footer() {
  return (
    <footer className="w-full bg-[#111827] text-gray-300 py-8">
      <div className="max-w-6xl mx-auto px-6">

        {/* TOP SECTION */}
        <div className="grid md:grid-cols-2 gap-8">

          {/* BRAND */}
          <div>
            <h2 className="text-2xl font-bold text-white">MyChats</h2>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              A real-time chat application created by me, Alok Raj, as my 
              <span className="text-indigo-400 font-medium"> Final Semester BCA Project &#123; IGNOU &#125;</span>
            </p>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">Details : Enrollment - 2300178846</p>
          </div>

          {/* SOCIALS */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Connect with Me</h3>
            <div className="flex items-center gap-4 text-xl">
              <a href="https://github.com/alok7720" target="_blank" rel="noreferrer"
                className="hover:text-white transition">
                <i className="fa fa-github"></i>
              </a>
              <a href="https://linkedin.com/in/alokraj007/" target="_blank" rel="noreferrer"
                className="hover:text-white transition">
                <i className="fa fa-linkedin-square"></i>
              </a>
              <a href="mailto:alokraj69798999@gmail.com" className="hover:text-white transition">
                <i className="fa fa-envelope"></i>
              </a>
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="border-t border-gray-700 mt-8 pt-4 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} MyChats — All Rights Reserved.
        </div>

      </div>
    </footer>
  );
}

export default Footer;