import Extend from 'flarum/common/extenders';
import RolevayaSettingsPage from './components/RolevayaSettingsPage';

export default [
  new Extend.Admin().page(RolevayaSettingsPage),
];