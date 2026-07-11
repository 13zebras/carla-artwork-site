import { createFileRoute } from '@tanstack/react-router';

import { Header } from '@/components/Header';
import { getAboutContent } from '@/lib/functions/about.functions';

export const Route = createFileRoute('/about')({
  loader: () => getAboutContent(),
  component: AboutComponent,
});

function getParagraphs(text: string) {
  let position = 0;
  return text
    .split(/\r?\n[\t ]*\r?\n+/)
    .map((value) => {
      const paragraph = value.trim();
      const id = `${position}-${paragraph.length}`;
      position += value.length;
      return { id, text: paragraph };
    })
    .filter((paragraph) => Boolean(paragraph.text));
}

function AboutComponent() {
  const about = Route.useLoaderData();
  const paragraphs = getParagraphs(about.text);

  return (
    <div className='relative bg-background min-h-screen text-foreground'>
      <Header />
      <main className='px-8 xs:px-10 sm:px-12 pt-50 sm:pt-52 xl:pt-44 pb-16'>
        <div className='mx-auto sm:pt-4 w-full max-w-4xl'>
          <div className='mb-6 sm:mb-10 text-center'>
            <h1 className='font-hand-rendered text-3xl sm:text-5xl'>
              About<span className='ml-3'>Carla</span>
            </h1>
          </div>

          <section className='flow-root'>
            {about.desktopImageUrl ? (
              <img
                src={about.desktopImageUrl}
                alt={about.imageAlt}
                className='hidden sm:block sm:float-right sm:mb-6 sm:ml-8 rounded-lg sm:w-2/5 lg:w-[42%] max-w-md h-auto'
              />
            ) : null}

            {paragraphs.map((paragraph) => (
              <p
                key={paragraph.id}
                className='mb-5 last:mb-0 text-muted-foreground text-base sm:text-lg leading-relaxed whitespace-pre-line'
              >
                {paragraph.text}
              </p>
            ))}

            {about.mobileImageUrl ? (
              <img
                src={about.mobileImageUrl}
                alt={about.imageAlt}
                className='sm:hidden block pt-2 rounded-lg w-full h-auto'
              />
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
