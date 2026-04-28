import { useSEO } from '../hooks/useSEO';

export const MissionStatementPage = () => {
  useSEO({
    title: 'Our Mission',
    description:
      'The Anonymous Legal Assistance Group defends constitutional and civil rights of individuals victimized by systemic corruption. Learn about our mission, core purpose, and commitment to justice through collective legal action.',
    keywords:
      'civil rights mission, legal advocacy, anonymous legal assistance, constitutional rights, whistleblower protection, legal aid, systemic corruption, institutional abuse',
    canonicalUrl: 'https://misjusticealliance.org/mission',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'Our Mission - MISJustice Alliance',
      description:
        'Defending constitutional and civil rights through collective legal action.',
      url: 'https://misjusticealliance.org/mission',
      mainEntity: {
        '@type': 'Organization',
        additionalType: 'NGO',
        name: 'Anonymous Legal Assistance Group',
        description:
          'Non-profit civil litigation advocacy collective dedicated to defending constitutional and civil rights.',
        areaServed: 'United States',
        knowsAbout: [
          'Civil Rights',
          'Police Misconduct',
          'Prosecutorial Misconduct',
          'Whistleblower Protection',
        ],
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-6">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-primary-700 font-serif mb-4">
          Our Mission
        </h1>
        <p className="text-xl text-neutral-600">
          Defending Constitutional and Civil Rights Through Collective Legal Action
        </p>
      </div>

      {/* Main Mission */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4">Mission</h2>
        <p className="text-neutral-700 leading-relaxed mb-4">
          The <strong>Anonymous Legal Assistance Group</strong> is an independent, non-profit civil litigation advocacy collective dedicated to defending the constitutional and civil rights of individuals who have been victimized by systemic corruption and misconduct within legal, governmental, and institutional frameworks.
        </p>
        <p className="text-neutral-700 leading-relaxed">
          Operating under a strict code of anonymity to protect both our volunteer legal professionals and the vulnerable individuals who seek our assistance, we serve as a powerful watchdog organization committed to exposing patterns of abuse that exploit power imbalances and overwhelm individual resources.
        </p>
      </div>

      {/* Core Purpose */}
      <div className="bg-gradient-to-br from-gold-50 to-gold-100 rounded-xl border border-gold-200 p-8 mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4">Core Purpose</h2>
        <p className="text-neutral-700 leading-relaxed">
          We exist to <strong>shine a public light on private and public institutions whose conduct demonstrates clear patterns of systemic corruption and misconduct that victimizes innocent individuals</strong>. Our particular focus centers on institutions whose sheer size, power, or jurisdictional scope enables them to overwhelm the resources any single individual could reasonably marshal in their own defense.
        </p>
      </div>

      {/* Areas of Expertise */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-6">Areas of Expertise</h2>
        <p className="text-neutral-700 mb-4">
          Our volunteer legal professionals contribute their time and specialized knowledge in cases involving:
        </p>
        <ul className="space-y-3">
          <li className="flex items-start">
            <span className="text-primary-600 mr-3">•</span>
            <span className="text-neutral-700">
              <strong>Civil rights violations</strong> and constitutional deprivations
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-3">•</span>
            <span className="text-neutral-700">
              <strong>Police misconduct and law enforcement abuse of power</strong>
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-3">•</span>
            <span className="text-neutral-700">
              <strong>Prosecutorial misconduct and judicial system failures</strong>
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-3">•</span>
            <span className="text-neutral-700">
              <strong>Legal malpractice</strong> by attorneys and court-appointed counsel
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-3">•</span>
            <span className="text-neutral-700">
              <strong>Institutional corruption</strong> within government agencies and non-profit organizations
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-3">•</span>
            <span className="text-neutral-700">
              <strong>Inter-jurisdictional coordination of harassment and abuse</strong>
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-3">•</span>
            <span className="text-neutral-700">
              <strong>Retaliation against whistleblowers and civil rights advocates</strong>
            </span>
          </li>
        </ul>
      </div>

      {/* Commitment to Anonymity */}
      <div className="bg-primary-50 rounded-xl border border-primary-200 p-8 mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4">Our Commitment to Anonymity</h2>
        <p className="text-neutral-700 leading-relaxed">
          <strong>Strict anonymity is fundamental to our mission</strong>. We maintain complete confidentiality for both our volunteer legal professionals and those seeking assistance to protect against retaliation, professional sanctions, and other forms of retribution that powerful institutions routinely deploy against those who challenge their misconduct.
        </p>
      </div>

      {/* How We Serve */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 mb-8">
        <h2 className="text-2xl font-bold text-primary-700 mb-4">How We Serve</h2>
        <p className="text-neutral-700 leading-relaxed mb-4">
          The Anonymous Legal Assistance Group <strong>is not a substitute for formal legal representation</strong> but works to bridge critical gaps in the justice system by:
        </p>
        <ul className="space-y-3">
          <li className="flex items-start">
            <span className="text-primary-600 mr-3">•</span>
            <span className="text-neutral-700">
              <strong>Providing comprehensive case review and legal analysis</strong> of civil rights violations and systemic misconduct
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-3">•</span>
            <span className="text-neutral-700">
              <strong>Offering strategic guidance and recommendations</strong> on how to proceed with complex legal matters
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-3">•</span>
            <span className="text-neutral-700">
              <strong>Connecting individuals with qualified legal representation</strong> appropriate to their specific circumstances and jurisdictional requirements
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-3">•</span>
            <span className="text-neutral-700">
              <strong>Developing comprehensive case narratives</strong> that document patterns of institutional abuse and corruption
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-3">•</span>
            <span className="text-neutral-700">
              <strong>Providing resources and support</strong> for navigating oversight agencies and regulatory bodies
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 mr-3">•</span>
            <span className="text-neutral-700">
              <strong>Educating the public</strong> about civil rights, legal protections, and available remedies
            </span>
          </li>
        </ul>
      </div>

      {/* Vision */}
      <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white rounded-xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
        <p className="text-primary-100 leading-relaxed">
          We envision a society where <strong className="text-white">no individual stands alone against institutional abuse of power</strong>. Through our collective expertise and unwavering commitment to justice, we work to restore balance to a system where powerful institutions are held accountable for their actions and where every person's constitutional rights are protected and defended.
        </p>
      </div>

      {/* Guiding Principles */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 mb-12">
        <h2 className="text-2xl font-bold text-primary-700 mb-6">Guiding Principles</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-primary-600 mb-2">
              Justice Through Collective Action
            </h3>
            <p className="text-neutral-700 leading-relaxed">
              We believe that coordinated legal expertise can effectively challenge even the most powerful institutions when they engage in systemic misconduct.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-primary-600 mb-2">
              Protection Through Anonymity
            </h3>
            <p className="text-neutral-700 leading-relaxed">
              Our anonymous structure ensures that both our volunteers and clients can pursue justice without fear of professional or personal retaliation.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-primary-600 mb-2">
              Transparency in Accountability
            </h3>
            <p className="text-neutral-700 leading-relaxed">
              While we protect individual identities, we are committed to bringing institutional misconduct into the public light where it can be properly addressed and remedied.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-primary-600 mb-2">
              Empowerment Through Knowledge
            </h3>
            <p className="text-neutral-700 leading-relaxed">
              We strive to educate and empower individuals to understand their rights and navigate complex legal systems.
            </p>
          </div>
        </div>
      </div>

      {/* Closing Statement */}
      <div className="bg-gold-50 border-l-4 border-gold-500 p-6 mb-12">
        <p className="text-neutral-700 leading-relaxed italic">
          The Anonymous Legal Assistance Group stands as a beacon of hope for those facing seemingly insurmountable institutional power, providing the collective strength, expertise, and resources necessary to pursue justice and accountability in our democratic society.
        </p>
      </div>
    </div>
  );
};
