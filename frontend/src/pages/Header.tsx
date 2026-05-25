export default function Header() {
  return (
    <header id="header" className="bg-white rounded-2xl border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <a className="flex items-center space-x-2" href="/">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600">
                  <svg
                    className="w-4 h-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 448 512"
                  >
                    <path
                      fill="white"
                      d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm64 192c17.7 0 32 14.3 32 32v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V256c0-17.7 14.3-32 32-32zm64-64c0-17.7 14.3-32 32-32s32 14.3 32 32V352c0 17.7-14.3 32-32 32s-32-14.3-32-32V160zM320 288c17.7 0 32 14.3 32 32v32c0 17.7-14.3 32-32 32s-32-14.3-32-32V320c0-17.7 14.3-32 32-32z"
                    />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900">QuizHub</span>
              </a>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a
                href="#"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                Features
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                Pricing
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
              >
                Log In
              </a>
            </div>
          </div>

          <div className="md:hidden">
            <button className="text-gray-600 hover:text-gray-900 focus:outline-none">
              <i className="text-lg" data-fa-i2svg="">
                <svg
                  className="svg-inline--fa fa-bars"
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fas"
                  data-icon="bars"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 448 512"
                  data-fa-i2svg=""
                >
                  <path
                    fill="currentColor"
                    d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"
                  ></path>
                </svg>
              </i>
            </button>
          </div>
        </div>

        <div className="md:hidden border-t border-gray-200 pt-4 pb-3 space-y-1">
          <a
            href="#"
            className="text-gray-600 hover:text-gray-900 block px-3 py-2 text-base font-medium"
          >
            Features
          </a>
          <a
            href="#"
            className="text-gray-600 hover:text-gray-900 block px-3 py-2 text-base font-medium"
          >
            Pricing
          </a>
          <a
            href="#"
            className="text-gray-600 hover:text-gray-900 block px-3 py-2 text-base font-medium"
          >
            Log In
          </a>
        </div>
      </nav>
    </header>
  );
}
