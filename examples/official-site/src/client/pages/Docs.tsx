import { Head, usePage } from '@inertiajs/react';
import Layout from '../components/Layout';
import { useTrans } from '../hooks/useTrans';

interface SidebarItem {
    title: string;
    path: string;
    children?: SidebarItem[];
}

interface DocsProps {
    title: string;
    content: string;
    sidebar: SidebarItem[];
    currentPath: string;
}

export default function Docs() {
    const { trans } = useTrans();
    // Safe cast
    const props = usePage().props as unknown as DocsProps;
    const { title, content, sidebar, currentPath } = props;

    return (
        <Layout>
            <Head title={`${title} - Gravito Docs`} />

            <div className="container mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">
                {/* Sidebar - Desktop */}
                <aside className="w-full lg:w-64 shrink-0 space-y-8">
                    {sidebar.map((section, idx) => (
                        <div key={idx}>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">
                                {section.title}
                            </h3>
                            <ul className="space-y-2 border-l border-gray-100 dark:border-gray-800 pl-4">
                                {section.children?.map((item, cIdx) => {
                                    const isActive = currentPath === item.path;
                                    return (
                                        <li key={cIdx}>
                                            <a
                                                href={item.path}
                                                className={`block text-sm transition-colors ${isActive
                                                        ? 'text-blue-600 font-medium border-l-2 border-blue-600 -ml-[17px] pl-[15px]'
                                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                                    }`}
                                            >
                                                {item.title}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </aside>

                {/* Content */}
                <article className="flex-1 min-w-0">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-8 text-gray-900 dark:text-gray-100">
                        {title}
                    </h1>

                    <div
                        className="prose prose-lg dark:prose-invert max-w-none 
                    prose-a:text-blue-600 hover:prose-a:text-blue-500
                    prose-code:text-pink-500 prose-code:bg-pink-50 dark:prose-code:bg-pink-900/20 prose-code:px-1 prose-code:rounded
                    prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800
                "
                        dangerouslySetInnerHTML={{ __html: content }}
                    />

                    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 flex justify-between text-sm text-gray-500">
                        <span>Last updated: {new Date().toLocaleDateString()}</span>
                        <a
                            href="https://github.com/CarlLee1983/gravito-core/tree/main/docs"
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-blue-600 flex items-center"
                        >
                            Edit this page on GitHub &rarr;
                        </a>
                    </div>
                </article>
            </div>
        </Layout>
    );
}
