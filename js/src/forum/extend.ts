import Extend from 'flarum/common/extenders';
import RolevayaPage from './pages/RolevayaPage';

export default [
  new Extend.Routes().add('top', '/top', RolevayaPage),
];