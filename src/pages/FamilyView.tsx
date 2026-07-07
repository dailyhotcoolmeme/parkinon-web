import { useParams } from 'react-router-dom';
import Records from './Records';
import { useT } from '../i18n';

export default function FamilyView() {
  const { t } = useT();
  const { userId } = useParams();
  if (!userId) return <div className="center">{t('familyView.invalidAccess')}</div>;
  return <Records targetUserId={userId} />;
}
