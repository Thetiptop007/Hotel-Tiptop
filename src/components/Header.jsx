import logoFull from "../assets/logo-full.png";

export default function Header({ title, subtitle }) {
    return (
        <header className="bg-white shadow-lg border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <img
                            src={logoFull}
                            alt="TipTop Hotel"
                            className="h-10 w-auto object-contain mr-3"
                        />
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                TipTop Hotel
                            </h1>
                            {subtitle && (
                                <p className="text-sm text-gray-600">{subtitle}</p>
                            )}
                        </div>
                    </div>
                    {title && (
                        <div className="text-right">
                            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
