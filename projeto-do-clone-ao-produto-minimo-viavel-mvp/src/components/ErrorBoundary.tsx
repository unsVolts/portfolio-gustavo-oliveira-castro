import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let message = 'Ocorreu um erro inesperado.';
      
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            message = `Erro no Firestore: ${parsed.error} (${parsed.operationType} em ${parsed.path})`;
          }
        }
      } catch (e) {
        message = this.state.error?.message || message;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-6 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md border border-red-100">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Ops! Algo deu errado.</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#D81B60] text-white rounded-xl font-bold hover:bg-[#AD1457] transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
