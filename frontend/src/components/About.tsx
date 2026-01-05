export function About() {
  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-center items-center pb-3 border-b-2 border-coffee/50">
        <div className="h-4 flex items-center">
          <span className="text-sm font-bold text-coffee">About</span>
        </div>
      </div>
      <div className="p-4 text-coffee text-center">
        <div className="text-sm font-medium space-y-4 mb-8">
          <p>
            Welcome to RaceCard!.
          </p>
          <p>
            Choose a community RaceCard set on the left, or upload one of your own and let our AI generate multiple choice options.
          </p>
          <p>
            Then invite your friends to join the lobby with the link above.
          </p>
        </div>

        <div className="mt-auto pt-1">
          <h3 className="text-sm font-bold mb-3">Check me out</h3>
          <div className="flex justify-center gap-4">
            <a
              href="https://github.com/leakyhose"
              target="_blank"
              rel="noopener noreferrer"
              className="text-coffee hover:text-terracotta transition-colors"
              aria-label="GitHub"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/yiming-su-b0115418b/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-coffee hover:text-terracotta transition-colors"
              aria-label="LinkedIn"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="12"></rect>
                <circle cx="4" cy="4" r="2"></circle>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
