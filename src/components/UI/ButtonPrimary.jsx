import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const ButtonPrimary = (props) => {
  function viewProjectsHandler() {
    if (props.projectBtn) {
      // Project view tracking can be implemented later
      console.log('Project button clicked');
    }
  }

  return (
    <button
      onClick={viewProjectsHandler}
      className="border text-base border-primary w-fit py-2 px-4 hover:bg-[#C778DD] hover:bg-opacity-20 transition-all duration-200"
    >
      <Link
        href={props.link || '#'}
        className="flex items-center gap-2 text-white"
      >
        {props.name}
        <span className="text-base">
          {props.icon && <FontAwesomeIcon icon={props.icon} />}
        </span>
      </Link>
    </button>
  );
};

export default ButtonPrimary;