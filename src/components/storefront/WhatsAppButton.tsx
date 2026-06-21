"use client";

export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/8801774433063"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="whatsapp-fab"
    >
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 3C8.82 3 3 8.82 3 16c0 2.42.67 4.67 1.83 6.6L3 29l6.57-1.8A13 13 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3z" fill="white"/>
        <path d="M21.9 18.9c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.2-.57-.35z" fill="#25D366"/>
      </svg>
      <style>{`
        .whatsapp-fab {
          position: fixed;
          bottom: 90px;
          right: 20px;
          z-index: 50;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #25D366;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(37,211,102,0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .whatsapp-fab:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 24px rgba(37,211,102,0.55);
        }
        @media (min-width: 768px) {
          .whatsapp-fab {
            bottom: 28px;
            right: 28px;
          }
        }
      `}</style>
    </a>
  );
}
