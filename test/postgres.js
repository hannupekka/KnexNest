'use strict';

var Knex = require('knex');
var knexnest = require('../knexnest');

// to use postgres, the pg npm module must be installed
var knex = Knex({
	client: 'postgres',
	connection: process.env.DATABASE_URL
});

var testData = ''
	+ 'CREATE TEMPORARY TABLE temp_user ('
	+ '  id INTEGER PRIMARY KEY,'
	+ '  name VARCHAR(100) NOT NULL,'
	+ '  city VARCHAR(100),'
	+ '  country VARCHAR(100)'
	+ ');'
	+ 'CREATE TEMPORARY TABLE temp_product ('
	+ '  id INTEGER PRIMARY KEY,'
	+ '  title VARCHAR(100) NOT NULL'
	+ ');'
	+ 'CREATE TEMPORARY TABLE temp_user_product ('
	+ '  id INTEGER PRIMARY KEY,'
	+ '  user_id INTEGER NOT NULL,'
	+ '  product_id INTEGER NOT NULL'
	+ ');'
	+ 'INSERT INTO temp_user (id, name, city, country) VALUES'
	+ '  (1, \'Olga Chavez\', null, \'Country A\'),'
	+ '  (2, \'Carol Pierce\', \'City A\', \'Country B\')'
	+ ';'
	+ 'INSERT INTO temp_product (id, title) VALUES'
	+ '  (1, \'Orange Fresh Wrap\'),'
	+ '  (2, \'Water Wetner\'),'
	+ '  (3, \'Mug Mitten\')'
	+ ';'
	+ 'INSERT INTO temp_user_product (id, user_id, product_id) VALUES'
	+ '  (1, 1, 1),'
	+ '  (2, 1, 2),'
	+ '  (3, 1, 3),'
	+ '  (4, 2, 2),'
	+ '  (5, 2, 3)'
	+ ';'
;

knex.raw(testData)
	// NOTHING COMPLICATED, SHOULD WORK ACROSS EVERYTHING
	.then(function () {
		var sql = knex
			.select(
				'u.id     AS _id',
				'u.name   AS _name',
				'u.city   AS _livesIn_city',
				'u.country   AS _livesIn_country',
				'p.id     AS _has__id',
				'p.title  AS _has__title'
			)
			.from('temp_user AS u')
			.innerJoin('temp_user_product AS up', 'u.id', 'up.user_id')
			.innerJoin('temp_product AS p', 'p.id', 'up.product_id')
		;
		return knexnest(sql);
	})
	.then(function (data) {
		var expected = [
			{
				id: 1,
				name: 'Olga Chavez',
				has: [
					{id: 1, title: 'Orange Fresh Wrap'},
					{id: 2, title: 'Water Wetner'},
					{id: 3, title: 'Mug Mitten'}
				],
				livesIn: {
					city: null,
					country: 'Country A'
				}
			},
			{
				id: 2,
				name: 'Carol Pierce',
				has: [
					{id: 2, title: 'Water Wetner'},
					{id: 3, title: 'Mug Mitten'}
				],
				livesIn: {
					city: 'City A',
					country: 'Country B'
				}
			}
		];
		var strExpected = JSON.stringify(expected, null, '');
		var strData = JSON.stringify(data, null, '');
		if (strData !== strExpected) {
			throw Error('Expected\n' + strExpected + '\n to equal result of\n' + strData);
		}
	})
	// LONG NAMES THAT WOULD GIVE POSTGRES PROBLEMS IF NOT CORRECTED BY KNEXNEST
	.then(function () {
		var sql = knex
			.select(
				'u.id           AS _id',
				'u.name         AS _aReallyReallyReallyReallyReallyReallyReallyReallyReallyLongProperty',
				'p.id           AS _has__id',
				'p.title        AS _has__aReallyReallyReallyReallyReallyReallyReallyReallyLongProperty',
				knex.raw('p.title AS "_has__aReallyReallyReallyReallyReallyReallyReallyLongQuotedProperty"'),
				knex.raw('p.title AS "_has__aReallyReallyReallyReallyReallyReallyReallyLongUnquotedProperty"')
			)
			.from('temp_user AS u')
			.innerJoin('temp_user_product AS up', 'u.id', 'up.user_id')
			.innerJoin('temp_product AS p', 'p.id', 'up.product_id')
			.where('u.id', 1)
			.andWhere('p.id', 1)
		;
		return knexnest(sql);
	})
	.then(function (data) {
		var expected = [
			{
				id: 1,
				aReallyReallyReallyReallyReallyReallyReallyReallyReallyLongProperty: 'Olga Chavez',
				has: [
					{
						id: 1,
						aReallyReallyReallyReallyReallyReallyReallyReallyLongProperty: 'Orange Fresh Wrap',
						aReallyReallyReallyReallyReallyReallyReallyLongQuotedProperty: 'Orange Fresh Wrap',
						aReallyReallyReallyReallyReallyReallyReallyLongUnquotedProperty: 'Orange Fresh Wrap'
					},
				]
			}
		];
		var strExpected = JSON.stringify(expected, null, '  ');
		var strData = JSON.stringify(data, null, '  ');
		if (strData !== strExpected) {
			throw Error('Expected\n' + strExpected + '\n to equal result of\n' + strData);
		}
	})
	.then(function () {
		process.stdout.write('Success\n');
	})
	// ERROR OUTPUT AND CLEAN UP
	.catch(function (error) {
		console.error(error); // eslint-disable-line no-console
	})
	.then(function () {
		knex.destroy();
	})
;
