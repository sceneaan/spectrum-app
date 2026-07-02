import { View, Image } from 'react-native';
import React from 'react';
import { Text } from 'react-native-paper';
import { heightPercentageToDP } from 'react-native-responsive-screen';

const RiyalText = ({
    text,
    textStyle,
    size,
    variant,
    logoColor = false,
}) => {
    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center', gap: 5,
        }}>
            <Image source={logoColor ?
                require('../assets/images/riyal-white.png')
                : require('../assets/images/riyal.png')}
                style={{
                    height: size ? size : heightPercentageToDP(1.5),
                    width: size ? size : heightPercentageToDP(1.5),
                }} />
            <Text
                variant={variant}
                style={textStyle}>
                {text}
            </Text>
        </View>
    );
};

export default RiyalText;