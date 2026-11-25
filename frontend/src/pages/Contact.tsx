import { Link } from 'react-router-dom'

const contacts = [
  { titre: 'Téléphone', valeur: '77 981 68 06', href: 'tel:+221779816806', action: 'Appeler', aide: 'Pour vos questions sur la plateforme et ses services.' },
  { titre: 'Téléphone secondaire', valeur: '76 991 66 04', href: 'tel:+221769916604', action: 'Appeler', aide: 'Un autre moyen de joindre ImmoSénégal.' },
  { titre: 'Adresse e-mail', valeur: 'khady05.sall@gmail.com', href: 'mailto:khady05.sall@gmail.com?subject=Contact%20ImmoS%C3%A9n%C3%A9gal', action: 'Envoyer un e-mail', aide: 'Pour nous transmettre votre demande par écrit.' },
]

export default function Contact() {
  return (
    <div className="contact-page min-h-[70vh]">
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-nuit-950 via-nuit-900 to-nuit-800 px-4 py-16 text-white sm:py-20 lg:py-24">
        <div className="absolute inset-0 -z-10 opacity-20" aria-hidden="true">
          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border-[36px] border-dore-400" />
          <div className="absolute -bottom-36 left-1/3 h-96 w-96 rounded-full border-[48px] border-white/20" />
        </div>
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-dore-300">ImmoSénégal · À votre écoute</p>
          <h1 className="mt-4 max-w-3xl font-titre text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">Parlons de votre projet immobilier.</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
            Une question sur une annonce, une visite ou l’utilisation de la plateforme ?
            Choisissez le moyen de contact qui vous convient.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="https://wa.me/221779816806" target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full border border-dore-300 bg-dore-400 px-6 py-3 font-bold text-nuit-950 shadow-lg transition hover:bg-dore-300">Écrire sur WhatsApp</a>
            <a href="mailto:khady05.sall@gmail.com?subject=Contact%20ImmoS%C3%A9n%C3%A9gal" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/60 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20">Envoyer un e-mail</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-700">Nos coordonnées</p>
          <h2 className="mt-2 text-3xl font-bold text-nuit-950">Comment nous joindre ?</h2>
          <p className="mt-3 leading-relaxed text-slate-600">Retrouvez les coordonnées d’ImmoSénégal. Les liens vous permettent d’appeler directement ou d’ouvrir votre messagerie.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <article key={contact.titre} className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-nuit-950/10">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-700">{contact.titre}</p>
              <p className="mt-3 break-words text-xl font-bold text-nuit-950">{contact.valeur}</p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{contact.aide}</p>
              <a href={contact.href} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-nuit-900 px-4 py-2.5 text-center font-semibold text-white transition hover:bg-nuit-800">{contact.action}</a>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-dore-200 bg-white p-6 shadow-xl shadow-nuit-950/10 sm:p-8">
            <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Retrouvez-nous</p>
            <h2 className="mt-2 text-2xl font-bold text-nuit-950">Ziguinchor, Sénégal</h2>
            <p className="mt-3 leading-relaxed text-slate-600">ImmoSénégal est une plateforme numérique dédiée à la recherche, à la vente et à la location de biens immobiliers au Sénégal. Elle facilite la mise en relation entre propriétaires, agences et personnes à la recherche d’un logement.</p>
            <a href="https://www.google.com/maps/search/?api=1&query=Ziguinchor%2C%20S%C3%A9n%C3%A9gal" target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-dore-500 bg-dore-400 px-6 py-3 text-center font-bold text-nuit-950 shadow-md transition hover:-translate-y-0.5 hover:bg-dore-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-nuit-900 sm:w-auto">Voir Ziguinchor sur la carte</a>
          </article>
          <article className="rounded-3xl bg-gradient-to-br from-nuit-950 to-nuit-800 p-6 text-white shadow-xl shadow-nuit-950/15 sm:p-8">
            <p className="text-sm font-bold uppercase tracking-wide text-dore-300">Besoin d’un logement ?</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Votre recherche commence ici.</h2>
            <p className="mt-3 leading-relaxed text-white/85">Parcourez les annonces, comparez les biens et consultez leurs informations avant d’envoyer une demande de visite.</p>
            <Link to="/catalogue" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-dore-400 px-5 py-2.5 font-bold text-nuit-950 transition hover:bg-dore-300">Consulter le catalogue</Link>
          </article>
        </div>
        <p className="mt-8 text-center text-sm leading-relaxed text-slate-600">Pour une question sur une annonce précise, ouvrez sa fiche depuis le catalogue et utilisez les moyens de contact proposés sur cette annonce.</p>
      </section>
    </div>
  )
}
