/**
 * Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 * Licensed under the Amazon Software License  http://aws.amazon.com/asl/
**/

const celebs = require('./documents/birthday.json');

const MONTHS = {"january": 0, "february": 1, "march": 2, "april": 3, "may": 4, "june": 5, "july": 6, "august": 7, "september": 8, "october": 9, "november": 10, "december": 11}

const getRandomCeleb = function(pastCelebs = []) {
  const filtered = celebs.filter(c => !pastCelebs.find(pc => pc.id === c.id));
  return filtered.length > 0
    ? filtered[Math.floor(Math.random() * filtered.length)]
    : {"id":0, "name":null, "birthday": null};
};

const checkAnswer = function(currentCeleb, month, year) {
  const birthday = new Date(currentCeleb.birthday);
  return birthday.getMonth() === MONTHS[month.toLowerCase()] && birthday.getFullYear() === parseInt(year);
};

const getHour = function(userTimeZone) {
  const currentDateTime = new Date(new Date().toLocaleString("en-US", {timeZone: userTimeZone}));
  return currentDateTime.getHours();
};

module.exports = {
  getRandomCeleb,
  checkAnswer,
  getHour
};