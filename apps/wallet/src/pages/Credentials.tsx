import PageShell from '../components/PageShell';
import Section from '../components/Section';
import CredentialCard from '../components/CredentialCard';
import EmptyState from '../components/EmptyState';
import { useWalletStore } from '../store/walletStore';

export default function Credentials() {
  const credentials = useWalletStore((state) => state.credentials);

  return (
    <PageShell title="Digital Credentials" subtitle="Your verified credentials in one place">
      <Section title="Verifiable credentials">
        {credentials.length === 0 ? (
          <EmptyState
            title="No credentials yet"
            body="Credentials issued to you will appear here."
          />
        ) : (
          <div className="wallet-stack">
            {credentials.map((credential) => (
              <CredentialCard key={credential.id} {...credential} />
            ))}
          </div>
        )}
      </Section>
    </PageShell>
  );
}
