import {
  GraphQLList,
  GraphQLInt,
} from 'graphql';
import moment from 'moment';
import { random, date, address } from 'faker';
import { resolver } from 'graphql-sequelize';
import models from '../../../../../models'
import {
  VehicleType,
  EventType,
  VehicleEventType,
  PredictionsType,
} from './types';
import Promise from 'bluebird';

const calculateEngineHours = (events) => {
  let seconds = 0;
  let starttime = moment(events[events.length - 1].endtime);
  for (let i = (events.length - 1); i >= 0; i--) {
    if (events[i].eventtypeid == 90) {
      starttime = moment(events[i].endtime);
    }

    if (events[i].eventtypeid == 91) {
      console.log('eventended');
      const endtime = moment(events[i].endtime);
      seconds += endtime.diff(starttime, 'milliseconds');
      starttime = null;
    }
  }
  console.log('seconds', seconds);
  const duration = moment.duration(seconds, 'm');
  return `${duration._data.hours}:${duration._data.minutes}`;
}

const Queries = {
  vehicles: {
    type: new GraphQLList(VehicleType),
    args: {
      vehicleid: { type: GraphQLInt },
    },
    resolve: (source, args) => models.vehicle.findAll({
      where: args,
      include: {
        model: models.vehicleEvent,
        as: 'events',
      },
      order: [
        [{ model: models.vehicleEvent, as: 'events' }, 'endtime', 'desc'],
      ]
    }).then((vehicles) => Promise.map(vehicles, (vehicle) => {
      vehicle.lastknowndata = [];
      vehicle.lastknowndata[0] = {};
      vehicle.enginehours = "00:00";
      if (vehicle.events.length) {
        vehicle.lastknowndata[0].longitude = vehicle.events[0].longitude;
        vehicle.lastknowndata[0].latitude = vehicle.events[0].latitude;
        vehicle.lastknowndata[0].location = vehicle.events[0].location;
        vehicle.enginehours = calculateEngineHours(vehicle.events);
        if (vehicle.events[0].vehicleeventid == vehicle.lastknowneventid) {
          console.log('Vehicle Events EventTypeId:', vehicle.events[0].eventtypeid)
          switch (vehicle.events[0].eventtypeid) {
            case 1:
              vehicle.lastknowndata[0].status = 'GPS Location';
              break;
            case 90:
              vehicle.lastknowndata[0].status = 'Power On';
              break;
            case 91:
              vehicle.lastknowndata[0].status = 'Power Off';
              break;
            case 92:
              vehicle.lastknowndata[0].status = 'Motion Stop';
              break;
            default:
              vehicle.lastknowndata[0].status = 'Unknown';
              break;
          }
          return vehicle;
        }
        vehicle.lastknowndata[0].status = 'Unknown';
      }
      return vehicle;
    })),
  },
  events: {
    type: new GraphQLList(EventType),
    resolve: resolver(models.event),
  },
  vehicleEvents: {
    type: new GraphQLList(VehicleEventType),
    resolve: (source, args) => models.vehicleEvent.findAll({
      where: args,
      order: [
        [endtime, order],
      ],
    }),
  },
  predictions: {
    type: new GraphQLList(PredictionsType),
    resolve: () => models.predictions.findAll()
      .then(data => {
        const returnable = data.map(vals => {
          const newObj = {};
          Object.keys(vals.dataValues).forEach(key => {
            newObj[key] = vals.dataValues[key];
          })
          newObj.summation = '40.18';
          return newObj;
        })
        return returnable;
      })
  },
};

export {
  Queries,
};
