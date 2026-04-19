/**
 * Mock for @expo/vector-icons
 */
const React = require('react');

const createIconMock = (name) => {
  const IconComponent = (props) => React.createElement('Text', props, props.name || name);
  IconComponent.displayName = name;
  return IconComponent;
};

module.exports = {
  Ionicons: createIconMock('Ionicons'),
  MaterialIcons: createIconMock('MaterialIcons'),
  FontAwesome: createIconMock('FontAwesome'),
  FontAwesome5: createIconMock('FontAwesome5'),
  MaterialCommunityIcons: createIconMock('MaterialCommunityIcons'),
  Feather: createIconMock('Feather'),
  AntDesign: createIconMock('AntDesign'),
  Entypo: createIconMock('Entypo'),
};

