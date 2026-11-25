import { MediaModelsView } from '@/components/media-models'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'

export default function VideoPage() {
  return <><div className="mb-5"><Link to="/video-studio" className={buttonVariants()}>Open video studio</Link></div><MediaModelsView modality="video" /></>
}
